import type { CardNewsMetrics, CardNewsReview, ScoredCardNews } from "./types.js";

export const DEFAULT_MIN_VISITS = 10;

export type ScoringOptions = {
  minVisits?: number;
};

export function scoreCardNews(metrics: CardNewsMetrics, options: ScoringOptions = {}): ScoredCardNews {
  const minVisits = options.minVisits ?? DEFAULT_MIN_VISITS;
  const score = metrics.spendKrw === 0 ? 0 : (metrics.profileVisits / metrics.spendKrw) * 100;

  return {
    ...metrics,
    saves: metrics.saves ?? 0,
    shares: metrics.shares ?? 0,
    weightedValue: metrics.profileVisits,
    score,
    conversionRate: 0,
    costPerFollowKrw: null,
    valueScorePer1000Krw: score,
    sampleQualified: metrics.profileVisits >= minVisits
  };
}

export function reviewCardNews(
  bestMetrics: CardNewsMetrics,
  candidateMetrics: CardNewsMetrics,
  options: ScoringOptions = {}
): CardNewsReview {
  const best = scoreCardNews(bestMetrics, options);
  const candidate = scoreCardNews(candidateMetrics, options);
  const reasons: string[] = [];
  const higherScore = candidate.score > best.score;
  const enoughVisits = candidate.profileVisits >= (options.minVisits ?? DEFAULT_MIN_VISITS);

  reasons.push(`방문 효율: 기존 ${best.score.toFixed(2)}, 신규 ${candidate.score.toFixed(2)}`);
  reasons.push(`신규 방문: ${candidate.profileVisits}`);

  if (higherScore && enoughVisits) {
    return {
      best,
      candidate,
      recommendation: "strong_replace",
      summary: "신규 게시글이 기준을 충족했습니다.",
      reasons
    };
  }

  if (higherScore) {
    return {
      best,
      candidate,
      recommendation: "observe",
      summary: "신규 게시글 점수가 더 높지만 방문이 부족합니다.",
      reasons
    };
  }

  return {
    best,
    candidate,
    recommendation: "keep_best",
    summary: "기존 베스트 점수가 더 높습니다.",
    reasons
  };
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
