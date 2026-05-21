import { formatPercent } from "./scoring.js";
import type { AutoCardNewsReview, CardNewsReview, ScoredCardNews } from "./types.js";

export function renderCardNewsReview(review: CardNewsReview): string {
  return [
    `결론: ${review.summary}`,
    "",
    "점수 비교",
    renderScoredLine("기존 베스트", review.best),
    renderScoredLine("신규 게시글", review.candidate),
    "",
    "판단 근거",
    ...review.reasons.map((reason) => `- ${reason}`),
    "",
    "주의: 이 리포트는 읽기 전용 추천입니다. Meta 광고 상태, 예산, 캠페인, 광고 세트를 변경하지 않습니다."
  ].join("\n");
}

export function renderAutoCardNewsReview(autoReview: AutoCardNewsReview): string {
  return [
    `평가 기간: ${autoReview.timeRange.since} ~ ${autoReview.timeRange.until}`,
    `기존 베스트 광고: ${autoReview.bestAd.name} (${autoReview.bestAd.id})`,
    `신규 후보 광고: ${autoReview.candidateAd.name} (${autoReview.candidateAd.id})`,
    "",
    "스냅샷 기준 팔로우",
    renderSnapshotLine("기존 베스트", autoReview.bestSnapshot),
    renderSnapshotLine("신규 게시글", autoReview.candidateSnapshot),
    "",
    renderCardNewsReview(autoReview.review)
  ].join("\n");
}

function renderScoredLine(label: string, item: ScoredCardNews): string {
  const costPerFollow = item.costPerFollowKrw === null ? "N/A" : `${Math.round(item.costPerFollowKrw).toLocaleString("ko-KR")}원`;
  return `- ${label}(${item.name}): 점수 ${item.valueScorePer1000Krw.toFixed(2)}, 방문 ${item.profileVisits}, 팔로우 ${item.follows}, 전환율 ${formatPercent(item.conversionRate)}, 팔로우당 비용 ${costPerFollow}, 광고비 ${Math.round(item.spendKrw).toLocaleString("ko-KR")}원`;
}

function renderSnapshotLine(label: string, snapshot: AutoCardNewsReview["bestSnapshot"]): string {
  if (!snapshot) {
    return `- ${label}: media snapshot 없음`;
  }
  const fallback = snapshot.usedLifetimeFallback ? "첫 스냅샷이라 lifetime 사용" : "이전 스냅샷 대비 증가분";
  return `- ${label}: 이번 증가 팔로우 ${snapshot.deltaFollows}, 누적 팔로우 ${snapshot.follows}, 이번 증가 방문 ${snapshot.deltaProfileVisits}, 누적 방문 ${snapshot.profileVisits} (${fallback})`;
}
