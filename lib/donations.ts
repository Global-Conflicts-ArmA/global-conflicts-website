import axios from "axios";
import { Collection } from "mongodb";

export interface Donator {
    userId: string;
    displayName: string;
    nickname: string | null;
    displayAvatarURL: string | null;
}

interface FeeEstimate {
    platformFeeUsd: number;
    processingFeeUsd: number;
    conversionFeeMaxUsd: number;
    netMinUsd: number;
    netMaxUsd: number;
}

interface Funding {
    amountUsd: number;
    feeEstimate?: FeeEstimate;
    updatedAt: string;
    campaignId: string;
}

interface DonorCache {
    members: Donator[];
    updatedAt: string;
}

export interface DonationConfig {
    server_donation_goal_usd?: number;
    patreonActiveSupport?: Funding;
    donationMembers?: DonorCache;
}

type DataStatus = "fresh" | "cached" | "unavailable";

export interface DonationData {
    currentAmountNumUSD: number | null;
    feeEstimate: FeeEstimate | null;
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

async function fetchFunding(campaignId: string): Promise<Pick<Funding, "amountUsd" | "feeEstimate">> {
    if (!/^\d+$/.test(campaignId)) {
        throw new Error("Invalid PATREON_CAMPAIGN_ID");
    }
    const accessToken = process.env.PATREON_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error("Missing PATREON_ACCESS_TOKEN");
    }
    const url = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}`;
    const options = {
        timeout: TIMEOUT_MS,
        maxRedirects: 0,
        headers: { Authorization: `Bearer ${accessToken}` },
    };
    const response = await axios.get<{
        data: {
            id: string;
            attributes: { currency: string; is_monthly: boolean };
        };
    }>(url, {
        ...options,
        params: { "fields[campaign]": "currency,is_monthly" },
    });
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
    const membersUrl = new URL(`${url}/members`);
    membersUrl.searchParams.set("fields[member]", "patron_status,currently_entitled_amount_cents");
    membersUrl.searchParams.set("page[count]", "100");
    let next: string | null = membersUrl.toString();
    const visited = new Set<string>();
    const memberIds = new Set<string>();
    const activeAmounts: number[] = [];
    let cents = 0;
    while (next) {
        const pageUrl = new URL(next);
        if (pageUrl.origin !== membersUrl.origin || pageUrl.pathname !== membersUrl.pathname ||
            pageUrl.username || pageUrl.password || pageUrl.hash ||
            visited.has(pageUrl.toString()) || visited.size >= 100) {
            throw new Error("Patreon returned invalid member pagination");
        }
        visited.add(pageUrl.toString());
        const page = await axios.get<{
            data: { id: string; attributes: { patron_status: string | null; currently_entitled_amount_cents: number } }[];
            links?: { next?: string | null };
            meta?: { pagination?: { total?: number } };
        }>(pageUrl.toString(), options);
        if (!Array.isArray(page.data?.data)) {
            throw new Error("Patreon returned an invalid member list");
        }
        for (const member of page.data.data) {
            if (!member || typeof member.id !== "string" || memberIds.has(member.id) ||
                !member.attributes ||
                ![null, "active_patron", "former_patron", "declined_patron"].includes(member.attributes.patron_status)) {
                throw new Error("Patreon returned an invalid member");
            }
            memberIds.add(member.id);
            if (member.attributes.patron_status === "active_patron") {
                const amount = member.attributes.currently_entitled_amount_cents;
                if (!nonNegativeNumber(amount) || !Number.isSafeInteger(amount)) {
                    throw new Error("Patreon returned an invalid active member amount");
                }
                cents += amount;
                if (amount > 0) activeAmounts.push(amount);
                if (!Number.isSafeInteger(cents)) {
                    throw new Error("Patreon active support total was invalid");
                }
            }
        }
        const nextPage = page.data.links?.next;
        if (nextPage != null && typeof nextPage !== "string") {
            throw new Error("Patreon returned an invalid next member page");
        }
        next = nextPage ?? null;
        const total = page.data.meta?.pagination?.total;
        if (!next && total !== undefined && total !== memberIds.size) {
            throw new Error("Patreon returned an incomplete member list");
        }
    }
    let amountUsd = cents / 100;
    let usdRate = 1;
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
        usdRate = rate;
    }
    if (!nonNegativeNumber(amountUsd)) {
        throw new Error("Patreon funding calculation was invalid");
    }
    const roundUsd = (value: number) => Math.round(value * 100) / 100;
    const platformFeeUsd = roundUsd(amountUsd * 0.08);
    const processingFeeUsd = roundUsd(activeAmounts.reduce((total, amount) => {
        const usd = amount / 100 * usdRate;
        return total + roundUsd(usd <= 3 ? usd * 0.05 + 0.10 : usd * 0.029 + 0.30);
    }, 0));
    const conversionFeeMaxUsd = roundUsd(amountUsd * 0.025);
    const netMaxUsd = roundUsd(Math.max(0, amountUsd - platformFeeUsd - processingFeeUsd));
    const netMinUsd = roundUsd(Math.max(0, netMaxUsd - conversionFeeMaxUsd));
    return {
        amountUsd: roundUsd(amountUsd),
        feeEstimate: { platformFeeUsd, processingFeeUsd, conversionFeeMaxUsd, netMinUsd, netMaxUsd },
    };
}

function validFeeEstimate(value: FeeEstimate | undefined): value is FeeEstimate {
    return !!value && nonNegativeNumber(value.platformFeeUsd) &&
        nonNegativeNumber(value.processingFeeUsd) && nonNegativeNumber(value.conversionFeeMaxUsd) &&
        nonNegativeNumber(value.netMinUsd) && nonNegativeNumber(value.netMaxUsd) &&
        value.netMinUsd <= value.netMaxUsd;
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
            const saved = config?.patreonActiveSupport;
            if (saved && saved.campaignId === campaignId && nonNegativeNumber(saved.amountUsd) &&
                typeof saved.updatedAt === "string" && Number.isFinite(Date.parse(saved.updatedAt))) {
                cached = saved;
            }
            if (cached?.updatedAt && validFeeEstimate(cached.feeEstimate) && recent(cached.updatedAt)) return { value: cached, status: "fresh" as const };
            try {
                const estimate = await fetchFunding(campaignId);
                const value = { ...estimate, updatedAt: new Date().toISOString(), campaignId };
                try {
                    await configs.updateOne({}, { $set: { patreonActiveSupport: value } }, { upsert: true });
                } catch (error) {
                    logFailure("Patreon active support cache update failed", error);
                }
                return { value, status: "fresh" as const };
            } catch (error) {
                logFailure("Patreon active support refresh failed; using saved data if available", error);
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
        feeEstimate: validFeeEstimate(funding.value?.feeEstimate) ? funding.value.feeEstimate : null,
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
