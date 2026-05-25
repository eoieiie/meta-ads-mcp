import { calculateDeathmatchScore } from "./scoring.js";
import type { AdInsightsMetrics, DeathmatchReport, MetaAdSummary, TimeRange } from "./types.js";
import type { MetaReadOnlyClient } from "./metaClient.js";

export type DeathmatchSettings = {
  adAccountId: string;
  adSetId: string;
  timeRange: TimeRange;
};

export async function createDeathmatchReview(
  client: MetaReadOnlyClient,
  settings: DeathmatchSettings
): Promise<DeathmatchReport> {
  // 1. List all ads in the ad set
  const allAds = await client.listAdSetAds(settings.adSetId);
  
  // 2. Filter to ACTIVE only
  const activeAds = allAds.filter(
    (ad) => ad.effectiveStatus === "ACTIVE" || ad.status === "ACTIVE"
  );
  
  if (activeAds.length === 0) {
    throw new Error(`No ACTIVE ads found in ad set ${settings.adSetId}`);
  }
  
  // 3. Sort by created_time ASC → champion = oldest, challenger = newest
  const sorted = [...activeAds].sort(
    (a, b) => timestamp(a.createdTime) - timestamp(b.createdTime)
  );
  
  const championAd = sorted[0];
  const challengerAd = sorted.length >= 2 ? sorted[sorted.length - 1] : null;
  
  // 4. Fetch metrics
  const championMetrics = await client.getAccountAdInsights(
    settings.adAccountId,
    championAd.id,
    settings.timeRange
  );
  
  let challengerMetrics: AdInsightsMetrics | null = null;
  let score: ReturnType<typeof calculateDeathmatchScore> | null = null;
  let challengerDaily: AdInsightsMetrics[] = [];
  
  if (challengerAd) {
    challengerMetrics = await client.getAccountAdInsights(
      settings.adAccountId,
      challengerAd.id,
      settings.timeRange
    );
    score = calculateDeathmatchScore(championMetrics, challengerMetrics);
    challengerDaily = await client.getAccountAdDailyInsights(
      settings.adAccountId,
      challengerAd.id,
      settings.timeRange
    );
  }
  
  const championDaily = await client.getAccountAdDailyInsights(
    settings.adAccountId,
    championAd.id,
    settings.timeRange
  );
  
  // 5. Merge daily rows
  const dailyRows = mergeDailyRows(championDaily, challengerDaily);
  
  return {
    timeRange: settings.timeRange,
    adSetId: settings.adSetId,
    championAd,
    challengerAd: challengerAd ?? null,
    championMetrics,
    challengerMetrics,
    score,
    dailyRows
  };
}

function mergeDailyRows(
  championRows: AdInsightsMetrics[],
  challengerRows: AdInsightsMetrics[]
): DeathmatchReport["dailyRows"] {
  const dates = [
    ...new Set(
      [...championRows, ...challengerRows]
        .flatMap((row) => (row.dateStart ? [row.dateStart] : []))
    )
  ].sort();
  
  return dates.map((date) => ({
    date,
    champion: championRows.find((row) => row.dateStart === date) ?? emptyDaily(date),
    challenger: challengerRows.find((row) => row.dateStart === date) ?? emptyDaily(date)
  }));
}

function emptyDaily(date: string): AdInsightsMetrics {
  return {
    dateStart: date,
    dateStop: date,
    spendKrw: 0,
    impressions: 0,
    reach: 0,
    instagramProfileVisits: 0,
    saves: 0,
    shares: 0,
    likes: 0,
    actions: [],
    raw: null
  };
}

function timestamp(value: string | undefined): number {
  return value ? Date.parse(value) || 0 : 0;
}
