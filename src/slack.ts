import type { DeathmatchReport, DeathmatchScore } from "./types.js";

export type SlackPayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

export function renderSlackPayload(review: DeathmatchReport): SlackPayload {
  const since = formatKoreanDate(review.timeRange.since);
  const until = formatKoreanDate(review.timeRange.until);
  const title = `📊 Meta Ads 리포트: ${since} ~ ${until}`;

  const blocks: SlackPayload["blocks"] = [
    section(`*${title}*`),
    divider(),
    section(rawDataBlock(review)),
    divider(),
  ];

  if (review.score) {
    blocks.push(
      section(scoringBlock(review)),
      divider(),
      section(formulaBlock(review)),
      divider(),
    );
  } else {
    blocks.push(section("단일 광고만 운영 중입니다. (챌린저 없음)"));
    blocks.push(divider());
  }

  blocks.push(section(`*일별 성과*\n${dailyLines(review)}`));
  blocks.push(divider());
  blocks.push(context("읽기 전용 리포트입니다. Meta 광고 상태, 예산, 캠페인, 광고 세트를 변경하지 않습니다."));

  return {
    text: textFallback(review, title),
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

function textFallback(review: DeathmatchReport, title: string): string {
  const names = review.challengerAd
    ? `${review.championAd.name} vs ${review.challengerAd.name}`
    : `${review.championAd.name} (단일)`;
  return `${title}\n${names}`;
}

function formatKoreanDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function rawDataBlock(review: DeathmatchReport): string {
  const c = review.championMetrics;
  const champLine = `*챔피언* (${review.championAd.name}): 지출 ${won(c.spendKrw)} | 방문 ${c.instagramProfileVisits ?? 0} | 도달 ${c.reach} | 저장 ${c.saves} | 공유 ${c.shares} | 좋아요 ${c.likes}`;

  if (!review.challengerMetrics) return champLine;

  const ch = review.challengerMetrics;
  const challLine = `*챌린저* (${review.challengerAd!.name}): 지출 ${won(ch.spendKrw)} | 방문 ${ch.instagramProfileVisits ?? 0} | 도달 ${ch.reach} | 저장 ${ch.saves} | 공유 ${ch.shares} | 좋아요 ${ch.likes}`;

  return `*게시글별 핵심 지표*\n${champLine}\n${challLine}`;
}

function scoringBlock(review: DeathmatchReport): string {
  const s = review.score!;
  return [
    `*상대 평가 점수*`,
    ``,
    `챔피언: 기준점 100점 (CPPV: ${won(s.championCPPV)} | 저장공유율: ${formatPercent(s.championSaveRate)})`,
    `챌린저: 총점 *${s.challengerHS.toFixed(1)}점* (CPPV: ${won(s.challengerCPPV)} | 저장공유율: ${formatPercent(s.challengerSaveRate)})`,
    `  - 세부: 방문 단가 ${s.costScore.toFixed(1)}점 + 매력도 ${s.attrScore.toFixed(1)}점 - 빈도 페널티 ${s.penalty.toFixed(1)}점`,
  ].join("\n");
}

function formulaBlock(review: DeathmatchReport): string {
  const s = review.score!;
  return [
    `*📐 점수 산출식*`,
    `${buildCostFormula(s)}`,
    `${buildAttrFormula(s)}`,
    `${buildPenaltyFormula(s)}`,
    `Challenger HS = ${s.costScore.toFixed(1)} + ${s.attrScore.toFixed(1)} - ${s.penalty.toFixed(1)} = ${s.challengerHS.toFixed(1)}점 (vs Champion 100점)`,
  ].join("\n");
}

function buildCostFormula(s: DeathmatchScore): string {
  const cppvC = s.championCPPV;
  const cppvCh = s.challengerCPPV;
  if (cppvC === 0 && cppvCh === 0) {
    return `① CostScore: 양쪽 방문 0 → 60점 (중립)`;
  }
  if (cppvC === 0 && cppvCh > 0) {
    return `① CostScore: 챔피언 방문 0 → 120점 (최대)`;
  }
  if (cppvC > 0 && cppvCh === 0) {
    return `① CostScore: 챌린저 방문 0 → 0점 (최소)`;
  }
  return `① CostScore = min((${Math.round(cppvC).toLocaleString()} ÷ ${Math.round(cppvCh).toLocaleString()}) × 60, 120) = ${s.costScore.toFixed(1)}점`;
}

function buildAttrFormula(s: DeathmatchScore): string {
  const srC = s.championSaveRate;
  const srCh = s.challengerSaveRate;
  if (srC === 0 && srCh === 0) {
    return `② AttrScore: 양쪽 저장+공유 0 → 0점`;
  }
  if (srC === 0 && srCh > 0) {
    return `② AttrScore: 챔피언 저장+공유 0, 챌린저 있음 → 40점`;
  }
  return `② AttrScore = min((${formatPercent(srCh)} ÷ ${formatPercent(srC)}) × 40, 80) = ${s.attrScore.toFixed(1)}점`;
}

function buildPenaltyFormula(s: DeathmatchScore): string {
  const freq = s.challengerFrequency;
  if (freq < 2.0) {
    return `③ Penalty: Frequency ${freq.toFixed(1)} (2.0 미만) → 0점`;
  }
  return `③ Penalty = (${freq.toFixed(1)} - 2.0) × 10 = ${s.penalty.toFixed(1)}점`;
}

function dailyLines(review: DeathmatchReport): string {
  if (review.dailyRows.length === 0) return "일별 데이터 없음";
  return review.dailyRows
    .map((row) => {
      const champ = `챔피언 광고비 ${won(row.champion.spendKrw)}, 방문 ${row.champion.instagramProfileVisits ?? 0}, 저장 ${row.champion.saves} | 도달 ${row.champion.reach}`;
      if (!review.challengerMetrics) return `${row.date}: ${champ}`;
      const chall = `챌린저 광고비 ${won(row.challenger.spendKrw)}, 방문 ${row.challenger.instagramProfileVisits ?? 0}, 저장 ${row.challenger.saves} | 도달 ${row.challenger.reach}`;
      return `${row.date}: ${champ} / ${chall}`;
    })
    .join("\n");
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
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
