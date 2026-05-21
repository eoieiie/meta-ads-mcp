import type { CardNewsMetrics, CardNewsReview, ScoredCardNews } from "./types.js";

export const DEFAULT_FOLLOW_WEIGHT = 12;
export const DEFAULT_MIN_VISITS = 10;
export const DEFAULT_MIN_CONVERSION_RATE = 0.1;
export const DEFAULT_STRONG_MARGIN = 0;

export type ScoringOptions = {
  followWeight?: number;
  minVisits?: number;
  minConversionRate?: number;
  strongMargin?: number;
};

export function scoreCardNews(metrics: CardNewsMetrics, options: ScoringOptions = {}): ScoredCardNews {
  const followWeight = options.followWeight ?? DEFAULT_FOLLOW_WEIGHT;
  const minVisits = options.minVisits ?? DEFAULT_MIN_VISITS;
  const conversionRate = metrics.profileVisits === 0 ? 0 : metrics.follows / metrics.profileVisits;
  const weightedValue = metrics.profileVisits + metrics.follows * followWeight;
  const score = metrics.spendKrw === 0 ? 0 : (weightedValue / metrics.spendKrw) * 100;

  return {
    ...metrics,
    saves: metrics.saves ?? 0,
    shares: metrics.shares ?? 0,
    weightedValue,
    score,
    conversionRate,
    costPerFollowKrw: metrics.follows === 0 ? null : metrics.spendKrw / metrics.follows,
    valueScorePer1000Krw: score,
    sampleQualified: metrics.profileVisits >= minVisits
  };
}

export function reviewCardNews(
  bestMetrics: CardNewsMetrics,
  candidateMetrics: CardNewsMetrics,
  options: ScoringOptions = {}
): CardNewsReview {
  const minConversionRate = options.minConversionRate ?? DEFAULT_MIN_CONVERSION_RATE;
  const best = scoreCardNews(bestMetrics, options);
  const candidate = scoreCardNews(candidateMetrics, options);
  const reasons: string[] = [];
  const higherScore = candidate.score > best.score;
  const enoughConversion = candidate.conversionRate >= minConversionRate;
  const enoughVisits = candidate.profileVisits >= (options.minVisits ?? DEFAULT_MIN_VISITS);

  reasons.push(`점수: 기존 ${best.score.toFixed(4)}, 신규 ${candidate.score.toFixed(4)}`);
  reasons.push(`신규 전환율: ${formatPercent(candidate.conversionRate)}`);
  reasons.push(`신규 방문: ${candidate.profileVisits}`);

  if (higherScore && enoughConversion && enoughVisits) {
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
      summary: "신규 게시글 점수가 더 높지만 기준 일부가 미충족입니다.",
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
