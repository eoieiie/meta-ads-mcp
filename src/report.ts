import type { AutoCardNewsReview, CardNewsReview, ScoredCardNews } from "./types.js";

export function renderCardNewsReview(review: CardNewsReview): string {
  return [
    `결론: ${review.summary}`,
    "",
    "방문 효율 비교",
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
    "전체 기간 기준: 기존 best",
    renderScoredLine("기존 best 전체", autoReview.bestLifecycle),
    "",
    "동일 기간 기준",
    renderScoredLine("기존 best 최근", autoReview.bestRecent),
    renderScoredLine("신규 게시글", autoReview.candidateRecent),
    "",
    "일별 성과",
    ...autoReview.dailyRows.map((row) => `- ${row.date}: best 광고비 ${formatWon(row.best.spendKrw)}, 방문 ${row.best.instagramProfileVisits ?? 0}, 저장 ${row.best.saves}, 공유 ${row.best.shares} / 신규 광고비 ${formatWon(row.candidate.spendKrw)}, 방문 ${row.candidate.instagramProfileVisits ?? 0}, 저장 ${row.candidate.saves}, 공유 ${row.candidate.shares}`),
    "",
    renderCardNewsReview(autoReview.review)
  ].join("\n");
}

function renderScoredLine(label: string, item: ScoredCardNews): string {
  return `- ${label}(${item.name}): 방문 효율 ${item.score.toFixed(2)} = 방문 ${item.profileVisits} ÷ ${formatWon(item.spendKrw)} | 저장 ${item.saves ?? 0} | 공유 ${item.shares ?? 0}`;
}

function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
