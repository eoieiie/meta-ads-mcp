import type { AutoCardNewsReview } from "./types.js";
import { renderAutoCardNewsReview } from "./report.js";
import { formatPercent } from "./scoring.js";

export type SlackPayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

export function renderSlackPayload(review: AutoCardNewsReview): SlackPayload {
  const title = `Meta Ads 리포트: ${review.timeRange.since} ~ ${review.timeRange.until}`;
  const verdict = review.review.summary;
  const best = review.review.best;
  const candidate = review.review.candidate;

  return {
    text: `${title}\n${verdict}`,
    blocks: [
      section(`*${title}*\n${verdict}`),
      section(`*점수 비교*\n${metricLine("기존 베스트", best)}\n${metricLine("신규 게시글", candidate)}`),
      section(`*스냅샷 기준 팔로우*\n${snapshotLine("기존 베스트", review.bestSnapshot)}\n${snapshotLine("신규 게시글", review.candidateSnapshot)}`),
      section(`*판단 근거*\n${review.review.reasons.map((reason) => `• ${reason}`).join("\n")}`),
      context("읽기 전용 리포트입니다. Meta 광고 상태, 예산, 캠페인, 광고 세트를 변경하지 않습니다."),
      context(`원문\n${renderAutoCardNewsReview(review)}`)
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

function metricLine(label: string, item: AutoCardNewsReview["review"]["best"]): string {
  const costPerFollow = item.costPerFollowKrw === null ? "N/A" : `${Math.round(item.costPerFollowKrw).toLocaleString("ko-KR")}원`;
  return `${label}: 점수 ${item.valueScorePer1000Krw.toFixed(2)}, 방문 ${item.profileVisits}, 팔로우 ${item.follows}, 전환율 ${formatPercent(item.conversionRate)}, 팔로우당 비용 ${costPerFollow}, 광고비 ${Math.round(item.spendKrw).toLocaleString("ko-KR")}원`;
}

function snapshotLine(label: string, snapshot: AutoCardNewsReview["bestSnapshot"]): string {
  if (!snapshot) {
    return `${label}: media snapshot 없음`;
  }
  const basis = snapshot.usedLifetimeFallback ? "lifetime fallback" : "delta";
  return `${label}: 이번 증가 팔로우 ${snapshot.deltaFollows}, 누적 팔로우 ${snapshot.follows}, 이번 증가 방문 ${snapshot.deltaProfileVisits}, 누적 방문 ${snapshot.profileVisits} (${basis})`;
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
