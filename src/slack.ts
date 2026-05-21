import type { AutoCardNewsReview } from "./types.js";
import { formatPercent } from "./scoring.js";

export type SlackPayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

export function renderSlackPayload(review: AutoCardNewsReview): SlackPayload {
  const title = `Meta Ads 리포트: ${review.timeRange.since} ~ ${review.timeRange.until}`;
  const result = scoreComparisonLine(review);

  return {
    text: `${title}\n${result}`,
    blocks: [
      section(`*${title}*\n${result}`),
      section(`*광고*\n${adLine("기존 베스트", review.bestAd)}\n${adLine("신규 게시글", review.candidateAd)}`),
      section(`*전체 기간 기준: 기존 best*\n${metricLine(review.bestLifecycle)}`),
      section(`*동일 기간 기준*\n기존 best: ${metricLine(review.bestRecent)}\n신규 게시글: ${metricLine(review.candidateRecent)}`),
      section(`*일별 성과*\n${dailyLines(review)}`),
      section(`*교체 기준 체크*\n${criteriaLines(review)}`),
      section(`*기타 게시글*\n${otherAdLines(review)}`),
      context("읽기 전용 리포트입니다. Meta 광고 상태, 예산, 캠페인, 광고 세트를 변경하지 않습니다.")
    ]
  };
}

export async function sendSlackWebhook(webhookUrl: string, payload: SlackPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed (${response.status}): ${body}`);
  }
}

function metricLine(item: AutoCardNewsReview["bestRecent"]): string {
  const costPerFollow = item.costPerFollowKrw === null ? "N/A" : `${Math.round(item.costPerFollowKrw).toLocaleString("ko-KR")}원`;
  const spend = item.spendKrw === 0 ? "0원 (기간 내 지출 없음 또는 Meta 반영 전)" : `${Math.round(item.spendKrw).toLocaleString("ko-KR")}원`;
  return `점수 ${formatScore(item.score)} = (방문 ${item.profileVisits} + 팔로우 ${item.follows} × 12) ÷ 광고비 ${spend}, 전환율 ${formatPercent(item.conversionRate)}, 팔로우당 비용 ${costPerFollow}, 저장 ${item.saves ?? 0}, 공유 ${item.shares ?? 0}`;
}

function adLine(label: string, ad: AutoCardNewsReview["bestAd"]): string {
  return `${label}: ${ad.name} (${ad.id})`;
}

function scoreComparisonLine(review: AutoCardNewsReview): string {
  const recentDirection = review.bestRecent.score >= review.bestLifecycle.score ? "높습니다" : "낮습니다";
  const winner = review.candidateRecent.score > review.bestRecent.score ? "신규 게시글 점수가 더 높습니다." : "기존 best 점수가 더 높습니다.";
  return `${winner} 기존 best 최근 점수 ${formatScore(review.bestRecent.score)}는 전체 기간 점수 ${formatScore(review.bestLifecycle.score)}보다 ${recentDirection}.`;
}

function criteriaLines(review: AutoCardNewsReview): string {
  return [
    `점수 우위: ${yesNo(review.candidateRecent.score > review.bestRecent.score)}`,
    `신규 전환율 10% 이상: ${yesNo(review.candidateRecent.conversionRate >= 0.1)} (${formatPercent(review.candidateRecent.conversionRate)})`,
    `신규 방문 10회 이상: ${yesNo(review.candidateRecent.profileVisits >= 10)} (${review.candidateRecent.profileVisits})`
  ].join("\n");
}

function dailyLines(review: AutoCardNewsReview): string {
  if (review.dailyRows.length === 0) {
    return "일별 데이터 없음";
  }
  return review.dailyRows
    .map((row) => `${row.date}: best 광고비 ${won(row.best.spendKrw)}, 방문 ${row.best.instagramProfileVisits ?? 0}, 저장 ${row.best.saves}, 공유 ${row.best.shares} / 신규 광고비 ${won(row.candidate.spendKrw)}, 방문 ${row.candidate.instagramProfileVisits ?? 0}, 저장 ${row.candidate.saves}, 공유 ${row.candidate.shares}`)
    .join("\n");
}

function otherAdLines(review: AutoCardNewsReview): string {
  if (review.otherAds.length === 0) {
    return "표시할 기타 게시글 성과 없음";
  }
  return review.otherAds.slice(0, 5).map((ad) => `${ad.name}: 전체 점수 ${formatScore(ad.score)} = (방문 ${ad.profileVisits} + 팔로우 ${ad.follows} × 12) ÷ 광고비 ${won(ad.spendKrw)}`).join("\n");
}

function yesNo(value: boolean): string {
  return value ? "예" : "아니오";
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatScore(value: number): string {
  return value.toFixed(4);
}

function section(text: string): Record<string, unknown> {
  return { type: "section", text: { type: "mrkdwn", text: truncate(text, 2900) } };
}

function context(text: string): Record<string, unknown> {
  return { type: "context", elements: [{ type: "mrkdwn", text: truncate(text, 2900) }] };
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
