import axios from "axios";
import { Collection } from "mongodb";

export interface Donator {
    userId: string;
    displayName: string;
    nickname: string | null;
    displayAvatarURL: string | null;
}

interface Funding {
    amountUsd: number;
    updatedAt: string;
    campaignId: string;
}

interface DonorCache {
    members: Donator[];
    updatedAt: string;
}

export interface DonationConfig {
    server_donation_goal_usd?: number;
    patreonMonthlyEstimate?: Funding;
    donationMembers?: DonorCache;
}

type DataStatus = "fresh" | "cached" | "unavailable";

export interface DonationData {
    currentAmountNumUSD: number | null;
    serverDonationGoalUsd: number | null;
    donators: Donator[];
    fundingStatus: DataStatus;
    fundingUpdatedAt: string | null;
    donorsStatus: DataStatus;
    donorsUpdatedAt: string | null;
}

const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10000;

function nonNegativeNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function recent(updatedAt: string): boolean {
    const age = Date.now() - Date.parse(updatedAt);
    return age >= 0 && age < CACHE_MS;
}

function logFailure(source: string, error: unknown) {
    // Axios errors can contain sensitive headers; never log the entire error.
    const upstream = axios.isAxiosError(error) && error.config?.url?.includes("/currencies/")
        ? " exchange-rate service" : "";
    const detail = axios.isAxiosError(error)
        ? `HTTP ${error.response?.status ?? "unavailable"}${upstream} (${error.code ?? "request failed"})`
        : error instanceof Error ? error.message : "Unknown error";
    console.error(`[donations] ${source}: ${detail}`);
}

async function fetchFunding(campaignId: string): Promise<number> {
    if (!/^\d+$/.test(campaignId)) {
        throw new Error("Invalid PATREON_CAMPAIGN_ID");
    }
    const response = await axios.get<{
        data: {
            id: string;
            attributes: { currency: string; is_monthly: boolean; campaign_pledge_sum: number };
        };
    }>(`https://www.patreon.com/api/campaigns/${campaignId}`, { timeout: TIMEOUT_MS });
    const campaign = response.data?.data;
    if (campaign?.id !== campaignId) {
        throw new Error("Patreon returned an invalid campaign");
    }
    const attributes = campaign.attributes;
    const currency = attributes?.currency;
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
        throw new Error("Patreon campaign returned an invalid currency");
    }
    if (attributes.is_monthly !== true) {
        throw new Error("Cannot use monthly funding for a per-creation Patreon campaign");
    }
    // This undocumented field matches the public monthly estimate. pledge_sum
    // is a different metric and can have a different pledge_sum_currency.
    const cents = attributes.campaign_pledge_sum;
    if (!nonNegativeNumber(cents) || !Number.isSafeInteger(cents)) {
        throw new Error("Patreon returned an invalid campaign_pledge_sum");
    }
    let amountUsd = cents / 100;
    if (currency !== "USD" && amountUsd > 0) {
        const code = currency.toLowerCase();
        const rates = await axios.get<Record<string, Record<string, number>>>(
            `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`,
            { timeout: TIMEOUT_MS }
        );
        const rate = rates.data?.[code]?.usd;
        if (!nonNegativeNumber(rate) || rate === 0) {
            throw new Error(`Exchange-rate service returned an invalid ${currency}/USD rate`);
        }
        amountUsd *= rate;
    }
    if (!nonNegativeNumber(amountUsd)) {
        throw new Error("Patreon funding calculation was invalid");
    }
    return Math.round(amountUsd * 100) / 100;
}

function parseDonators(data: unknown): Donator[] {
    if (!Array.isArray(data)) throw new Error("Discord bot returned an invalid donor list");
    return data.map((member) => {
        if (!member || typeof member.userId !== "string" ||
            typeof member.displayName !== "string" ||
            (member.nickname != null && typeof member.nickname !== "string") ||
            (member.displayAvatarURL != null && typeof member.displayAvatarURL !== "string")) {
            throw new Error("Discord bot returned an invalid donor");
        }
        return {
            userId: member.userId,
            displayName: member.displayName,
            nickname: member.nickname ?? null,
            displayAvatarURL: member.displayAvatarURL ?? null,
        };
    });
}

async function loadDonationData(configs: Collection<DonationConfig>): Promise<DonationData> {
    const config = await configs.findOne({});
    const campaignId = process.env.PATREON_CAMPAIGN_ID ?? "5074062";
    const goal = config?.server_donation_goal_usd;
    const serverDonationGoalUsd = nonNegativeNumber(goal) && goal > 0 ? goal : null;
    if (serverDonationGoalUsd === null) {
        console.error("[donations] Missing or invalid server_donation_goal_usd");
    }
    const [funding, donors] = await Promise.all([
        (async () => {
            let cached: Funding | null = null;
            const saved = config?.patreonMonthlyEstimate;
            if (saved && saved.campaignId === campaignId && nonNegativeNumber(saved.amountUsd) &&
                Number.isFinite(Date.parse(saved.updatedAt))) {
                cached = saved;
            }
            if (cached && recent(cached.updatedAt)) return { value: cached, status: "fresh" as const };
            try {
                const amountUsd = await fetchFunding(campaignId);
                const value = { amountUsd, updatedAt: new Date().toISOString(), campaignId };
                await configs.updateOne({}, { $set: { patreonMonthlyEstimate: value } }, { upsert: true });
                return { value, status: "fresh" as const };
            } catch (error) {
                logFailure("Patreon monthly estimate refresh failed; using saved data if available", error);
                return { value: cached, status: cached ? "cached" as const : "unavailable" as const };
            }
        })(),
        (async () => {
            let cached: DonorCache | null = null;
            try {
                const saved = config?.donationMembers;
                if (saved && Number.isFinite(Date.parse(saved.updatedAt))) {
                    cached = { members: parseDonators(saved.members), updatedAt: saved.updatedAt };
                }
            } catch (error) {
                logFailure("Invalid saved Discord donor list", error);
            }
            if (cached && recent(cached.updatedAt)) return { value: cached, status: "fresh" as const };
            try {
                const botUrl = (process.env.BOT_URL ?? "http://globalconflicts.net:3001").replace(/\/$/, "");
                const response = await axios.get(`${botUrl}/users/donators`, { timeout: TIMEOUT_MS });
                const value = { members: parseDonators(response.data), updatedAt: new Date().toISOString() };
                await configs.updateOne({}, { $set: { donationMembers: value } }, { upsert: true });
                return { value, status: "fresh" as const };
            } catch (error) {
                logFailure("Discord donor refresh failed; using saved data if available", error);
                return { value: cached, status: cached ? "cached" as const : "unavailable" as const };
            }
        })(),
    ]);
    return {
        currentAmountNumUSD: funding.value?.amountUsd ?? null,
        serverDonationGoalUsd,
        donators: donors.value?.members ?? [],
        fundingStatus: funding.status,
        fundingUpdatedAt: funding.value?.updatedAt ?? null,
        donorsStatus: donors.status,
        donorsUpdatedAt: donors.value?.updatedAt ?? null,
    };
}

let pending: Promise<DonationData> | undefined;

export async function getDonationData(configs: Collection<DonationConfig>): Promise<DonationData> {
    if (!pending) {
        pending = loadDonationData(configs).finally(() => { pending = undefined; });
    }
    return pending;
}
