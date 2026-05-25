import type { DeathmatchReport } from "./types.js";

export type SlackPayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

export function renderSlackPayload(review: DeathmatchReport): SlackPayload {
  const since = formatKoreanDate(review.timeRange.since);
  const until = formatKoreanDate(review.timeRange.until);
  const title = `📊 Meta Ads 데스매치 리포트: ${since} ~ ${until}`;

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
      section(winnerBlock(review)),
      divider(),
    );
  } else {
    blocks.push(section("⚔️ 챌린저 없음 — 단일 광고만 운영 중입니다."));
    blocks.push(divider());
  }

  blocks.push(section(`*일별 성과*\n${dailyLines(review)}`));
  blocks.push(divider());
  blocks.push(context("읽기 전용 리포트입니다. Meta 광고 상태, 예산, 캠페인, 광고 세트를 변경하지 않습니다."));

  const hasScore = !!review.score;
  return {
    text: `${title}\n${hasScore ? winnerBlock(review) : "단일 광고 리포트"}`,
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

function formatKoreanDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function rawDataBlock(review: DeathmatchReport): string {
  const c = review.championMetrics;
  const champLine = `👑 *챔피언* (${review.championAd.name}): 지출 ${won(c.spendKrw)} | 방문 ${c.instagramProfileVisits ?? 0} | 도달 ${c.reach} | 저장 ${c.saves} | 좋아요 ${c.likes}`;

  if (!review.challengerMetrics) return champLine;

  const ch = review.challengerMetrics;
  const challLine = `🥊 *챌린저* (${review.challengerAd!.name}): 지출 ${won(ch.spendKrw)} | 방문 ${ch.instagramProfileVisits ?? 0} | 도달 ${ch.reach} | 저장 ${ch.saves} | 좋아요 ${ch.likes}`;

  return `🔥 *게시글별 핵심 지표 (Ads Insights Raw Data)*\n${champLine}\n${challLine}`;
}

function scoringBlock(review: DeathmatchReport): string {
  const s = review.score!;

  return [
    `⚔️ *본선 결과: 챔피언 대비 상대 평가*`,
    ``,
    `🏆 *챔피언*: 기준점 100점 (CPPV: ${won(s.championCPPV)} | 저장률: ${formatPercent(s.championSaveRate)})`,
    `🥊 *챌린저*: 총점 *${s.challengerHS.toFixed(1)}점* (CPPV: ${won(s.challengerCPPV)} | 저장률: ${formatPercent(s.challengerSaveRate)})`,
    `  - 세부: 방문 단가 ${s.costScore.toFixed(1)}점 + 매력도 ${s.attrScore.toFixed(1)}점 - 빈도 페널티 ${s.penalty.toFixed(1)}점`,
  ].join("\n");
}

function winnerBlock(review: DeathmatchReport): string {
  const s = review.score!;
  const champName = review.championAd.name;
  const challName = review.challengerAd!.name;

  if (s.winner === "challenger") {
    return `💡 *AI 결단 플랜*\n🥇 *${challName}*의 압승입니다! (HS ${s.challengerHS.toFixed(1)}점 vs 100점)\n패배한 [${champName}] 광고는 지금 즉시 OFF 처리하고, 예산을 승자에게 몰아주세요.`;
  } else {
    return `💡 *AI 결단 플랜*\n👑 *${champName}*이(가) 여전히 챔피언입니다! (100점 vs ${s.challengerHS.toFixed(1)}점)\n챌린저 [${challName}]가 100점을 넘지 못했으므로, 현재 챔피언을 유지합니다.`;
  }
}

function dailyLines(review: DeathmatchReport): string {
  if (review.dailyRows.length === 0) return "일별 데이터 없음";
  return review.dailyRows
    .map((row) => {
      const champ = `👑 광고비 ${won(row.champion.spendKrw)}, 방문 ${row.champion.instagramProfileVisits ?? 0}, 저장 ${row.champion.saves} | 도달 ${row.champion.reach}`;
      if (!review.challengerMetrics) return `${row.date}: ${champ}`;
      const chall = `🥊 광고비 ${won(row.challenger.spendKrw)}, 방문 ${row.challenger.instagramProfileVisits ?? 0}, 저장 ${row.challenger.saves} | 도달 ${row.challenger.reach}`;
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
