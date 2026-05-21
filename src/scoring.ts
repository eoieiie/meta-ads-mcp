import type { CardNewsMetrics, CardNewsReview, ScoredCardNews } from "./types.js";

export const DEFAULT_FOLLOW_WEIGHT = 12;
export const DEFAULT_MIN_VISITS = 80;
export const DEFAULT_MIN_CONVERSION_RATE = 0.1;
export const DEFAULT_STRONG_MARGIN = 0.1;

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
  const valueScorePer1000Krw = metrics.spendKrw === 0 ? 0 : (weightedValue / metrics.spendKrw) * 1000;

  return {
    ...metrics,
    conversionRate,
    costPerFollowKrw: metrics.follows === 0 ? null : metrics.spendKrw / metrics.follows,
    valueScorePer1000Krw,
    sampleQualified: metrics.profileVisits >= minVisits
  };
}

export function reviewCardNews(
  bestMetrics: CardNewsMetrics,
  candidateMetrics: CardNewsMetrics,
  options: ScoringOptions = {}
): CardNewsReview {
  const minConversionRate = options.minConversionRate ?? DEFAULT_MIN_CONVERSION_RATE;
  const strongMargin = options.strongMargin ?? DEFAULT_STRONG_MARGIN;
  const best = scoreCardNews(bestMetrics, options);
  const candidate = scoreCardNews(candidateMetrics, options);
  const reasons: string[] = [];

  if (!candidate.sampleQualified) {
    reasons.push(`신규 게시글 방문 수가 최소 표본 기준보다 낮습니다: ${candidate.profileVisits}`);
    return {
      best,
      candidate,
      recommendation: "insufficient_sample",
      summary: "신규 게시글 점수와 무관하게 표본 부족으로 교체 추천하지 않습니다.",
      reasons
    };
  }

  if (candidate.conversionRate < minConversionRate) {
    reasons.push(`신규 게시글 전환율이 기준 미만입니다: ${formatPercent(candidate.conversionRate)}`);
    return {
      best,
      candidate,
      recommendation: "keep_best",
      summary: "신규 게시글 전환율이 낮아 기존 베스트 유지를 추천합니다.",
      reasons
    };
  }

  const strongThreshold = best.valueScorePer1000Krw * (1 + strongMargin);
  if (candidate.valueScorePer1000Krw >= strongThreshold) {
    reasons.push(`신규 점수가 기존 베스트보다 ${(strongMargin * 100).toFixed(0)}% 이상 높습니다.`);
    return {
      best,
      candidate,
      recommendation: "strong_replace",
      summary: "신규 게시글을 수동 교체 후보로 강하게 추천합니다.",
      reasons
    };
  }

  if (candidate.valueScorePer1000Krw > best.valueScorePer1000Krw) {
    reasons.push("신규 점수가 기존 베스트보다 높지만 차이가 작습니다.");
    return {
      best,
      candidate,
      recommendation: "observe",
      summary: "신규 게시글이 근소 우위입니다. 추가 관찰 후 수동 판단을 추천합니다.",
      reasons
    };
  }

  reasons.push("신규 점수가 기존 베스트보다 높지 않습니다.");
  return {
    best,
    candidate,
    recommendation: "keep_best",
    summary: "기존 베스트 유지를 추천합니다.",
    reasons
  };
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
