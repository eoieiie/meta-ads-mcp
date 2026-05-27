import type { DeathmatchReport, DeathmatchScore } from "./types.js";

export function renderDeathmatchReport(review: DeathmatchReport): string {
  const since = formatKoreanDate(review.timeRange.since);
  const until = formatKoreanDate(review.timeRange.until);
  const lines: string[] = [
    `📊 Meta Ads 리포트: ${since} ~ ${until}`,
    `광고 세트: ${review.adSetId}`,
    "",
    "[게시글별 핵심 지표]",
    renderMetricLine("챔피언", review.championAd.name, review.championMetrics),
  ];
  
  if (review.challengerMetrics) {
    lines.push(renderMetricLine("챌린저", review.challengerAd!.name, review.challengerMetrics));
  }
  
  if (review.score) {
    const s = review.score;
    lines.push(
      "",
      "[상대 평가 점수]",
      `챔피언: 기준점 100점 (CPPV: ${formatWon(s.championCPPV)} | 저장공유율: ${formatPercent(s.championSaveRate)})`,
      `챌린저: 총점 ${s.challengerHS.toFixed(1)}점 (CPPV: ${formatWon(s.challengerCPPV)} | 저장공유율: ${formatPercent(s.challengerSaveRate)})`,
      `  - 세부: 방문 단가 ${s.costScore.toFixed(1)}점 + 매력도 ${s.attrScore.toFixed(1)}점 - 빈도 페널티 ${s.penalty.toFixed(1)}점`,
      "",
      ...renderScoreFormula(s).split("\n"),
    );
  } else {
    lines.push("", "단일 광고만 운영 중입니다. (챌린저 없음)");
  }
  
  lines.push(
    "",
    "일별 성과",
    ...review.dailyRows.map((row) => {
      const champ = `챔피언 광고비 ${formatWon(row.champion.spendKrw)}, 방문 ${row.champion.instagramProfileVisits ?? 0}, 저장 ${row.champion.saves}, 도달 ${row.champion.reach}`;
      if (!review.challengerMetrics) return `- ${row.date}: ${champ}`;
      const chall = `챌린저 광고비 ${formatWon(row.challenger.spendKrw)}, 방문 ${row.challenger.instagramProfileVisits ?? 0}, 저장 ${row.challenger.saves}, 도달 ${row.challenger.reach}`;
      return `- ${row.date}: ${champ} / ${chall}`;
    }),
    "",
    "주의: 이 리포트는 읽기 전용입니다. Meta 광고 상태, 예산, 캠페인을 변경하지 않습니다."
  );
  
  return lines.join("\n");
}

function renderMetricLine(label: string, adName: string, metrics: { spendKrw: number; impressions: number; reach: number; instagramProfileVisits: number | null; saves: number; shares: number; likes: number }): string {
  return `* ${label} (${adName}): 지출 ${formatWon(metrics.spendKrw)} | 조회 ${metrics.impressions} | 도달 ${metrics.reach} | 방문 ${metrics.instagramProfileVisits ?? 0} | 저장 ${metrics.saves} | 공유 ${metrics.shares} | 좋아요 ${metrics.likes}`;
}

function renderScoreFormula(s: DeathmatchScore): string {
  return [
    "[점수 산출식]",
    buildCostFormula(s),
    buildAttrFormula(s),
    buildPenaltyFormula(s),
    `Challenger HS = ${s.costScore.toFixed(1)} + ${s.attrScore.toFixed(1)} - ${s.penalty.toFixed(1)} = ${s.challengerHS.toFixed(1)}점 (vs Champion 100점)`,
  ].join("\n");
}

function buildCostFormula(s: DeathmatchScore): string {
  const cppvC = s.championCPPV;
  const cppvCh = s.challengerCPPV;
  if (cppvC === 0 && cppvCh === 0) return `① CostScore: 양쪽 방문 0 → 60점 (중립)`;
  if (cppvC === 0 && cppvCh > 0) return `① CostScore: 챔피언 방문 0 → 120점 (최대)`;
  if (cppvC > 0 && cppvCh === 0) return `① CostScore: 챌린저 방문 0 → 0점 (최소)`;
  return `① CostScore = min((${Math.round(cppvC).toLocaleString()} ÷ ${Math.round(cppvCh).toLocaleString()}) × 60, 120) = ${s.costScore.toFixed(1)}점`;
}

function buildAttrFormula(s: DeathmatchScore): string {
  const srC = s.championSaveRate;
  const srCh = s.challengerSaveRate;
  if (srC === 0 && srCh === 0) return `② AttrScore: 양쪽 저장+공유 0 → 0점`;
  if (srC === 0 && srCh > 0) return `② AttrScore: 챔피언 저장+공유 0, 챌린저 있음 → 40점`;
  return `② AttrScore = min((${formatPercent(srCh)} ÷ ${formatPercent(srC)}) × 40, 80) = ${s.attrScore.toFixed(1)}점`;
}

function buildPenaltyFormula(s: DeathmatchScore): string {
  const freq = s.challengerFrequency;
  if (freq < 2.0) return `③ Penalty: Frequency ${freq.toFixed(1)} (2.0 미만) → 0점`;
  return `③ Penalty = (${freq.toFixed(1)} - 2.0) × 10 = ${s.penalty.toFixed(1)}점`;
}

function formatKoreanDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
