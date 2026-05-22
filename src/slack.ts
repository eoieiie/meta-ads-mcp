import type { AutoCardNewsReview, OtherAdWithRecent, ScoredCardNews } from "./types.js";

export type SlackPayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

export function renderSlackPayload(review: AutoCardNewsReview): SlackPayload {
  const title = `Meta Ads 리포트: ${review.timeRange.since} ~ ${review.timeRange.until}`;
  const hasCandidate = !!review.candidateAd;

  const blocks: SlackPayload["blocks"] = [
    section(`*${title}*`),
    divider(),
    section(keyMetricsBlock(review)),
    divider(),
    section(hasCandidate ? scoreComparisonLine(review) : "T세트에 신규 게시글 없음. best만 운영 중"),
    divider(),
    section(hasCandidate
      ? `*광고*\n${adLine("기존 베스트", review.bestAd)}\n${adLine("신규 게시글", review.candidateAd!)}`
      : `*광고*\n${adLine("기존 베스트", review.bestAd)}`
    ),
    divider(),
    section(`*전체 기간: 기존 best*\n${metricLine(review.bestLifecycle)}`),
  ];
  if (hasCandidate) {
    blocks.push(section(`*동일 기간*\n기존 best: ${metricLine(review.bestRecent)}\n신규 게시글: ${metricLine(review.candidateRecent!)}`));
  }
  blocks.push(divider());
  blocks.push(section(`*전체 기간 게시글별 점수*\n${allPostsTable(review)}`));
  if (review.otherAds.length > 0) {
    blocks.push(section(`*기타 게시글 최근 성과*\n${otherAdsRecentBlock(review)}`));
  }
  blocks.push(section(`*비교 방식 설명*\n${logicExplanation(review)}`));
  blocks.push(divider());
  blocks.push(section(`*일별 성과*\n${dailyLines(review)}`));
  if (hasCandidate) {
    blocks.push(divider());
    blocks.push(section(`*교체 조건*\n${criteriaLines(review)}`));
  }
  blocks.push(divider());
  blocks.push(context("읽기 전용 리포트입니다. Meta 광고 상태, 예산, 캠페인, 광고 세트를 변경하지 않습니다."));

  return {
    text: `${title}\n${hasCandidate ? scoreComparisonLine(review) : "T세트 신규 게시글 없음"}`,
    blocks
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

function keyMetricsBlock(review: AutoCardNewsReview): string {
  const best = `*기존 best*: 저장 ${review.bestRecent.saves} | 공유 ${review.bestRecent.shares} | 좋아요 ${review.bestRecent.likes} | 방문 ${review.bestRecent.profileVisits}`;
  if (!review.candidateAd) return `*핵심 반응 (최근)*\n${best}`;
  const cand = review.candidateRecent!;
  return `*핵심 반응 (최근)*\n${best}\n*신규 게시글*: 저장 ${cand.saves} | 공유 ${cand.shares} | 좋아요 ${cand.likes} | 방문 ${cand.profileVisits}`;
}

function otherAdsRecentBlock(review: AutoCardNewsReview): string {
  return review.otherAds.map((ad) => {
    const l = ad.recent;
    const deltaScore = ad.score !== 0 ? ((l.score - ad.score) / ad.score * 100).toFixed(1) : "—";
    const sign = l.score > ad.score ? "▲" : l.score < ad.score ? "▼" : "—";
    return `${stripAdName(ad.name)}: 효율 ${formatScore(l.score)} (저장 ${l.saves ?? 0} | 공유 ${l.shares ?? 0} | 좋아요 ${l.likes ?? 0}) ${sign}${deltaScore !== "—" ? deltaScore + "%" : ""}`;
  }).join("\n");
}

function stripAdName(name: string): string {
  return name.replace(/^grdn_참여_20260410[\s_-]*/, "");
}

function metricLine(item: AutoCardNewsReview["bestRecent"]): string {
  const spend = item.spendKrw === 0 ? "0원 (기간 내 지출 없음 또는 Meta 반영 전)" : `${Math.round(item.spendKrw).toLocaleString("ko-KR")}원`;
  return `방문 효율 ${formatScore(item.score)} = 방문 ${item.profileVisits} ÷ ${spend} | 저장 ${item.saves ?? 0} | 공유 ${item.shares ?? 0} | 좋아요 ${item.likes ?? 0}`;
}

function adLine(label: string, ad: AutoCardNewsReview["bestAd"]): string {
  return `${label}: ${ad.name} (${ad.id})`;
}

function scoreComparisonLine(review: AutoCardNewsReview): string {
  const cr = review.candidateRecent;
  const recentDirection = review.bestRecent.score >= review.bestLifecycle.score ? "높습니다" : "낮습니다";
  const winner = cr && cr.score > review.bestRecent.score ? "신규 게시글 방문 효율이 더 높습니다." : "기존 best 방문 효율이 더 높습니다.";
  return `${winner} 기존 best 최근 방문 효율 ${formatScore(review.bestRecent.score)}는 전체 기간 방문 효율 ${formatScore(review.bestLifecycle.score)}보다 ${recentDirection}.`;
}

function criteriaLines(review: AutoCardNewsReview): string {
  const cr = review.candidateRecent;
  if (!cr) return "비교할 신규 게시글 없음";
  return [
    `방문 효율 우위: ${yesNo(cr.score > review.bestRecent.score)}`,
    `신규 방문 10회 이상: ${yesNo(cr.profileVisits >= 10)} (${cr.profileVisits})`
  ].join("\n");
}

function dailyLines(review: AutoCardNewsReview): string {
  if (review.dailyRows.length === 0) {
    return "일별 데이터 없음";
  }
  const hasCandidate = !!review.candidateAd;
  return review.dailyRows
    .map((row) => {
      const best = `best 광고비 ${won(row.best.spendKrw)}, 방문 ${row.best.instagramProfileVisits ?? 0}, 저장 ${row.best.saves}, 공유 ${row.best.shares} | 좋아요 ${row.best.likes}`;
      const candidate = hasCandidate
        ? ` / 신규 광고비 ${won(row.candidate.spendKrw)}, 방문 ${row.candidate.instagramProfileVisits ?? 0}, 저장 ${row.candidate.saves}, 공유 ${row.candidate.shares} | 좋아요 ${row.candidate.likes}`
        : "";
      return `${row.date}: ${best}${candidate}`;
    })
    .join("\n");
}

function allPostsTable(review: AutoCardNewsReview): string {
  const allPosts: Array<ScoredCardNews & { _marker: string }> = [
    { ...review.bestLifecycle, _marker: "★BEST" },
  ];
  if (review.candidateLifecycle) {
    allPosts.push({ ...review.candidateLifecycle, _marker: "★NEW" });
  }
  allPosts.push(...review.otherAds.map((a) => ({ ...a, _marker: "" })));
  allPosts.sort((a, b) => b.score - a.score);
  return allPosts.map((p, i) => {
    const marker = p._marker;
    const flag = marker ? ` ${marker}` : "";
    return `${i + 1}. ${stripAdName(p.name)}${flag}: 방문 효율 ${formatScore(p.score)} (방문 ${p.profileVisits}, ${won(p.spendKrw)})`;
  }).join("\n");
}

function logicExplanation(review: AutoCardNewsReview): string {
  const period = `${review.timeRange.since} ~ ${review.timeRange.until}`;
  return [
    `*동일 기간*: 두 게시글이 각자의 세트에서 동시 운영된 ${period} 데이터로 비교합니다.`,
    `*방문 효율* = 방문 ÷ 광고비 × 100 (광고비 차이를 정규화한 효율 지표)`,
    `*전체 기간 점수*는 참고용입니다. 각 게시글이 광고에 사용된 전체 기간의 누적 효율이며, 같은 조건의 동일 기간 비교와 다를 수 있습니다.`,
  ].join("\n");
}

function yesNo(value: boolean): string {
  return value ? "예" : "아니오";
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function divider(): Record<string, unknown> {
  return { type: "divider" };
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
