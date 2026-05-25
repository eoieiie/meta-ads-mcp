import test from "node:test";
import assert from "node:assert/strict";
import type { AdInsightsMetrics, MetaAdSummary } from "../src/types.js";

// Mock client that returns predefined data without API calls
class MockMetaClient {
  private ads: MetaAdSummary[];
  private adMetrics: Map<string, AdInsightsMetrics>;
  private dailyMetrics: Map<string, AdInsightsMetrics[]>;

  constructor(opts: {
    ads: MetaAdSummary[];
    adMetrics: Map<string, AdInsightsMetrics>;
    dailyMetrics?: Map<string, AdInsightsMetrics[]>;
  }) {
    this.ads = opts.ads;
    this.adMetrics = opts.adMetrics;
    this.dailyMetrics = opts.dailyMetrics ?? new Map();
  }

  async listAdSetAds(_adSetId: string): Promise<MetaAdSummary[]> {
    return this.ads;
  }

  async getAccountAdInsights(_accountId: string, adId: string, _timeRange: { since: string; until: string }): Promise<AdInsightsMetrics> {
    const m = this.adMetrics.get(adId);
    if (!m) throw new Error(`No mock metrics for ad ${adId}`);
    return m;
  }

  async getAccountAdDailyInsights(_accountId: string, adId: string, _timeRange: { since: string; until: string }): Promise<AdInsightsMetrics[]> {
    return this.dailyMetrics.get(adId) ?? [];
  }
}

test("createDeathmatchReview selects champion (oldest) and challenger (newest) from 2 ACTIVE ads", async () => {
  // dynamic import to avoid circular issues; real import works fine at runtime
  const { createDeathmatchReview } = await import("../src/autoReview.js");
  const ads: MetaAdSummary[] = [
    { id: "old-1", name: "first", effectiveStatus: "ACTIVE", createdTime: "2026-05-10T00:00:00+0900" },
    { id: "new-2", name: "second", effectiveStatus: "ACTIVE", createdTime: "2026-05-20T00:00:00+0900" },
  ];
  const client = new MockMetaClient({
    ads,
    adMetrics: new Map([
      ["old-1", { spendKrw: 10000, impressions: 5000, reach: 3000, instagramProfileVisits: 100, saves: 50, shares: 5, likes: 30, actions: [], raw: null }],
      ["new-2", { spendKrw: 5000, impressions: 3000, reach: 2000, instagramProfileVisits: 80, saves: 40, shares: 3, likes: 20, actions: [], raw: null }],
    ]),
  });

  const report = await createDeathmatchReview(client as any, {
    adAccountId: "act_test",
    adSetId: "set-test",
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
  });

  assert.equal(report.championAd.id, "old-1");
  assert.equal(report.challengerAd!.id, "new-2");
  assert.ok(report.score !== null);
  assert.equal(report.adSetId, "set-test");
});

test("createDeathmatchReview returns champion only when 1 ACTIVE ad exists", async () => {
  const { createDeathmatchReview } = await import("../src/autoReview.js");
  const ads: MetaAdSummary[] = [
    { id: "ad-1", name: "solo", effectiveStatus: "ACTIVE", createdTime: "2026-05-15T00:00:00+0900" },
  ];
  const client = new MockMetaClient({
    ads,
    adMetrics: new Map([
      ["ad-1", { spendKrw: 10000, impressions: 5000, reach: 3000, instagramProfileVisits: 100, saves: 50, shares: 5, likes: 30, actions: [], raw: null }],
    ]),
  });

  const report = await createDeathmatchReview(client as any, {
    adAccountId: "act_test",
    adSetId: "set-test",
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
  });

  assert.equal(report.championAd.id, "ad-1");
  assert.equal(report.challengerAd, null);
  assert.equal(report.score, null);
});

test("createDeathmatchReview throws when 0 ACTIVE ads", async () => {
  const { createDeathmatchReview } = await import("../src/autoReview.js");
  const ads: MetaAdSummary[] = [
    { id: "paused-1", name: "paused", effectiveStatus: "PAUSED", createdTime: "2026-05-10T00:00:00+0900" },
  ];
  const client = new MockMetaClient({
    ads,
    adMetrics: new Map(),
  });

  await assert.rejects(
    () => createDeathmatchReview(client as any, {
      adAccountId: "act_test",
      adSetId: "set-test",
      timeRange: { since: "2026-05-21", until: "2026-05-24" },
    }),
    /No ACTIVE ads/
  );
});
