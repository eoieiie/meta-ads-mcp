import { reviewCardNews } from "./scoring.js";
import type { AutoCardNewsReview, CardNewsMetrics, MetaAdSummary, TimeRange } from "./types.js";
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
  const bestAd = selectActiveAd(await client.listAdSetAds(settings.bestAdSetId), "best");
  const candidateAd = selectActiveAd(await client.listAdSetAds(settings.newAdSetId), "new");
  const state = await loadReviewState(settings.statePath);

  const best = await loadAutoMetrics(client, settings.adAccountId, bestAd, settings.timeRange, state.media[bestAd.creative?.sourceInstagramMediaId ?? ""]);
  const candidate = await loadAutoMetrics(
    client,
    settings.adAccountId,
    candidateAd,
    settings.timeRange,
    state.media[candidateAd.creative?.sourceInstagramMediaId ?? ""]
  );
  const review = reviewCardNews(best, candidate);
  review.reasons.push("팔로우 수는 Instagram Media Insights lifetime 값과 로컬 스냅샷 차이로 계산합니다. 이전 스냅샷이 없으면 lifetime 값을 사용합니다.");

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
    snapshot
  };
}

function compareUpdatedDesc(left: MetaAdSummary, right: MetaAdSummary): number {
  return timestamp(right.updatedTime) - timestamp(left.updatedTime);
}

function timestamp(value: string | undefined): number {
  return value ? Date.parse(value) || 0 : 0;
}
