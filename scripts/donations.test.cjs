const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", "lib", "donations.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2017 } },
).outputText;

async function load(amounts, { config = {}, blocked = false, currency = "USD" } = {}) {
    const writes = [];
    const logs = [];
    const module = { exports: {} };
    const axios = {
        isAxiosError: () => false,
        get: async url => {
            if (url.includes("patreon.com")) {
                if (blocked) throw new Error("Test upstream failure");
                if (!url.includes("/members")) return {
                    data: { data: { id: "5074062", attributes: { currency, is_monthly: true } } },
                };
                return { data: { data: amounts.map((cents, index) => ({
                    id: String(index),
                    attributes: { patron_status: "active_patron", currently_entitled_amount_cents: cents },
                })) } };
            }
            if (url.includes("/currencies/")) return { data: { cad: { usd: 0.75 } } };
            return { data: [] };
        },
    };
    vm.runInNewContext(code, {
        module, exports: module.exports,
        require: () => axios,
        process: { env: { PATREON_ACCESS_TOKEN: "test-token" } },
        console: { error: line => logs.push(line) },
        Date, URL, URLSearchParams,
    });
    const result = await module.exports.getDonationData({
        findOne: async () => ({ server_donation_goal_usd: 94.82, ...config }),
        updateOne: async (filter, update) => writes.push(update.$set),
    });
    return { result, writes, logs };
}

test("processing fees use the exact $3 threshold and ignore zero entitlements", async () => {
    const { result } = await load([0, 100, 300, 301]);
    assert.equal(result.currentAmountNumUSD, 7.01);
    assert.equal(result.feeEstimate.platformFeeUsd, 0.56);
    assert.equal(result.feeEstimate.processingFeeUsd, 0.79);
    assert.equal(result.feeEstimate.conversionFeeMaxUsd, 0.18);
    assert.equal(result.feeEstimate.netMaxUsd, 5.66);
    assert.equal(result.feeEstimate.netMinUsd, 5.48);
});

test("converts each entitlement to USD before applying USD fee assumptions", async () => {
    const { result } = await load([400, 800], { currency: "CAD" });
    assert.equal(result.currentAmountNumUSD, 9);
    assert.equal(result.feeEstimate.processingFeeUsd, 0.72);
    assert.equal(result.feeEstimate.netMaxUsd, 7.56);
    assert.equal(result.feeEstimate.netMinUsd, 7.33);
});

test("zero support has no fees or negative net", async () => {
    const { result } = await load([0]);
    assert.equal(result.feeEstimate.netMinUsd, 0);
    assert.equal(result.feeEstimate.netMaxUsd, 0);
    assert.equal(result.feeEstimate.processingFeeUsd, 0);
});

test("cache preserves the gross amount and complete fee breakdown on failure", async () => {
    const fresh = await load([1000, 300]);
    const saved = fresh.writes.find(write => write.patreonActiveSupport).patreonActiveSupport;
    const { result } = await load([], { blocked: true, config: {
        patreonActiveSupport: { ...saved, updatedAt: "2025-01-01T00:00:00.000Z" },
    } });
    assert.equal(result.fundingStatus, "cached");
    assert.equal(result.currentAmountNumUSD, fresh.result.currentAmountNumUSD);
    assert.equal(JSON.stringify(result.feeEstimate), JSON.stringify(fresh.result.feeEstimate));
});

test("legacy cached gross data is refreshed for fees or explicitly lacks an estimate", async () => {
    const config = { patreonActiveSupport: {
        amountUsd: 124.51, campaignId: "5074062", updatedAt: new Date().toISOString(),
    } };
    const failed = await load([], { blocked: true, config });
    assert.equal(failed.result.feeEstimate, null);
    assert.equal(failed.result.currentAmountNumUSD, 124.51);
    assert.equal(failed.result.fundingStatus, "cached");
    assert(failed.logs.length > 0);
    const refreshed = await load([1000], { config });
    assert.equal(refreshed.result.currentAmountNumUSD, 10);
    assert(refreshed.result.feeEstimate);
});
