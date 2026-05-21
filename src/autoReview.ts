import { reviewCardNews, scoreCardNews } from "./scoring.js";
import type { AdInsightsMetrics, AutoCardNewsReview, CardNewsMetrics, MetaAdSummary, ScoredCardNews, TimeRange } from "./types.js";
import type { MetaReadOnlyClient } from "./metaClient.js";
import { createDeltaSnapshot, loadReviewState, saveReviewState, upsertMediaSnapshot } from "./stateStore.js";

export type AutoReviewSettings = {
  adAccountId: string;
  bestAdSetId: string;
  newAdSetId: string;
  timeRange: TimeRange;
  updateState?: boolean;
  statePath?: string;
};

export async function createAutoCardNewsReview(
  client: MetaReadOnlyClient,
  settings: AutoReviewSettings
): Promise<AutoCardNewsReview> {
  const bestAds = await client.listAdSetAds(settings.bestAdSetId);
  const candidateAds = await client.listAdSetAds(settings.newAdSetId);
  const bestAd = selectActiveAd(bestAds, "best");
  const candidateAd = selectActiveAd(candidateAds, "new");
  const state = await loadReviewState(settings.statePath);

  const best = await loadAutoMetrics(client, settings.adAccountId, bestAd, settings.timeRange, state.media[bestAd.creative?.sourceInstagramMediaId ?? ""]);
  const candidate = await loadAutoMetrics(
    client,
    settings.adAccountId,
    candidateAd,
    settings.timeRange,
    state.media[candidateAd.creative?.sourceInstagramMediaId ?? ""]
  );
  const bestLifecycleMetrics = await loadLifecycleMetrics(client, settings.adAccountId, bestAd);
  const bestLifecycle = scoreCardNews(bestLifecycleMetrics);
  const bestRecent = scoreCardNews(best);
  const candidateRecent = scoreCardNews(candidate);
  const review = reviewCardNews(best, candidate);
  const [bestDaily, candidateDaily] = await Promise.all([
    client.getAccountAdDailyInsights(settings.adAccountId, bestAd.id, settings.timeRange),
    client.getAccountAdDailyInsights(settings.adAccountId, candidateAd.id, settings.timeRange)
  ]);
  const otherAds = await loadOtherAds(client, settings.adAccountId, [...bestAds, ...candidateAds], new Set([bestAd.id, candidateAd.id]));

  if (settings.updateState ?? true) {
    let nextState = state;
    if (best.snapshot) {
      nextState = upsertMediaSnapshot(nextState, best.snapshot);
    }
    if (candidate.snapshot) {
      nextState = upsertMediaSnapshot(nextState, candidate.snapshot);
    }
    await saveReviewState(nextState, settings.statePath);
  }

  return {
    timeRange: settings.timeRange,
    bestAd,
    candidateAd,
    bestLifecycle,
    bestRecent,
    candidateRecent,
    dailyRows: mergeDailyRows(bestDaily, candidateDaily),
    otherAds,
    bestSnapshot: best.snapshot,
    candidateSnapshot: candidate.snapshot,
    review
  };
}

export function selectActiveAd(ads: MetaAdSummary[], label: string): MetaAdSummary {
  const activeAds = ads.filter((ad) => ad.effectiveStatus === "ACTIVE" || ad.status === "ACTIVE");
  const candidates = activeAds.length > 0 ? activeAds : ads;

  if (candidates.length === 0) {
    throw new Error(`No ads found in ${label} ad set.`);
  }

  return [...candidates].sort(compareUpdatedDesc)[0];
}

async function loadAutoMetrics(
  client: MetaReadOnlyClient,
  adAccountId: string,
  ad: MetaAdSummary,
  timeRange: TimeRange,
  previousSnapshot: Parameters<typeof createDeltaSnapshot>[2]
): Promise<CardNewsMetrics & { snapshot?: ReturnType<typeof createDeltaSnapshot> }> {
  const adInsights = await client.getAccountAdInsights(adAccountId, ad.id, timeRange);
  const mediaId = ad.creative?.sourceInstagramMediaId;
  const mediaInsights = mediaId ? await client.getInstagramMediaInsights(mediaId) : null;
  const snapshot = mediaId && mediaInsights ? createDeltaSnapshot(mediaId, mediaInsights, previousSnapshot) : undefined;

  return {
    name: ad.name,
    spendKrw: adInsights.spendKrw,
    profileVisits: adInsights.instagramProfileVisits ?? mediaInsights?.profileVisits ?? 0,
    follows: snapshot?.deltaFollows ?? mediaInsights?.follows ?? 0,
    saves: adInsights.saves,
    shares: adInsights.shares,
    snapshot
  };
}

async function loadLifecycleMetrics(client: MetaReadOnlyClient, adAccountId: string, ad: MetaAdSummary): Promise<CardNewsMetrics> {
  const adInsights = await client.getAccountAdInsightsMaximum(adAccountId, ad.id);
  const mediaId = ad.creative?.sourceInstagramMediaId;
  const mediaInsights = mediaId ? await client.getInstagramMediaInsights(mediaId) : null;
  return {
    name: ad.name,
    spendKrw: adInsights.spendKrw,
    // 전체 기간 기준은 게시글 lifetime 방문/팔로우 사용 (광고 단위 방문은 일부만 반영)
    profileVisits: mediaInsights?.profileVisits ?? adInsights.instagramProfileVisits ?? 0,
    follows: mediaInsights?.follows ?? 0,
    saves: adInsights.saves,
    shares: adInsights.shares
  };
}

async function loadOtherAds(
  client: MetaReadOnlyClient,
  adAccountId: string,
  ads: MetaAdSummary[],
  excludedIds: Set<string>
): Promise<ScoredCardNews[]> {
  const uniqueAds = [
    ...new Map(
      ads
        .filter((ad) => !excludedIds.has(ad.id))
        .map((ad) => [ad.creative?.sourceInstagramMediaId ?? ad.id, ad])
    ).values()
  ];
  const scored = await Promise.all(
    uniqueAds.map(async (ad) => {
      const metrics = await loadLifecycleMetrics(client, adAccountId, ad);
      return scoreCardNews(metrics);
    })
  );
  return scored.filter((item) => item.spendKrw > 0 || item.profileVisits > 0 || item.follows > 0).sort((left, right) => right.score - left.score);
}

function mergeDailyRows(bestRows: AdInsightsMetrics[], candidateRows: AdInsightsMetrics[]): AutoCardNewsReview["dailyRows"] {
  const dates = [...new Set([...bestRows, ...candidateRows].flatMap((row) => (row.dateStart ? [row.dateStart] : [])))].sort();
  return dates.map((date) => ({
    date,
    best: bestRows.find((row) => row.dateStart === date) ?? emptyDaily(date),
    candidate: candidateRows.find((row) => row.dateStart === date) ?? emptyDaily(date)
  }));
}

function emptyDaily(date: string): AdInsightsMetrics {
  return { dateStart: date, dateStop: date, spendKrw: 0, instagramProfileVisits: 0, saves: 0, shares: 0, actions: [], raw: null };
}

function compareUpdatedDesc(left: MetaAdSummary, right: MetaAdSummary): number {
  return timestamp(right.updatedTime) - timestamp(left.updatedTime);
}

function timestamp(value: string | undefined): number {
  return value ? Date.parse(value) || 0 : 0;
}
