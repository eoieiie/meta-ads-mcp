import type { DeathmatchReport } from "./types.js";

export function renderDeathmatchReport(review: DeathmatchReport): string {
  const since = formatKoreanDate(review.timeRange.since);
  const until = formatKoreanDate(review.timeRange.until);
  const lines: string[] = [
    `📊 Meta Ads 데스매치 리포트: ${since} ~ ${until}`,
    `광고 세트: ${review.adSetId}`,
    "",
    "🔥 [게시글별 핵심 지표 (Ads Insights Raw Data)]",
    renderMetricLine("👑 챔피언", review.championAd.name, review.championMetrics),
  ];
  
  if (review.challengerMetrics) {
    lines.push(renderMetricLine("🥊 챌린저", review.challengerAd!.name, review.challengerMetrics));
  }
  
  if (review.score) {
    const s = review.score;
    lines.push(
      "",
      "⚔️ [본선 결과: 챔피언 대비 상대 평가]",
      `🏆 챔피언: 기준점 100점 (CPPV: ${formatWon(s.championCPPV)} | 저장률: ${formatPercent(s.championSaveRate)})`,
      `🥊 챌린저: 총점 ${s.challengerHS.toFixed(1)}점 (CPPV: ${formatWon(s.challengerCPPV)} | 저장률: ${formatPercent(s.challengerSaveRate)})`,
      `  - 세부: 방문 단가 ${s.costScore.toFixed(1)}점 + 매력도 ${s.attrScore.toFixed(1)}점 - 빈도 페널티 ${s.penalty.toFixed(1)}점`,
      "",
      renderWinnerBlock(review),
    );
  } else {
    lines.push("", "⚔️ 챌린저 없음 — 단일 광고만 운영 중입니다.");
  }
  
  lines.push(
    "",
    "일별 성과",
    ...review.dailyRows.map((row) => {
      const champ = `👑 광고비 ${formatWon(row.champion.spendKrw)}, 방문 ${row.champion.instagramProfileVisits ?? 0}, 저장 ${row.champion.saves}, 도달 ${row.champion.reach}`;
      if (!review.challengerMetrics) return `- ${row.date}: ${champ}`;
      const chall = `🥊 광고비 ${formatWon(row.challenger.spendKrw)}, 방문 ${row.challenger.instagramProfileVisits ?? 0}, 저장 ${row.challenger.saves}, 도달 ${row.challenger.reach}`;
      return `- ${row.date}: ${champ} / ${chall}`;
    }),
    "",
    "주의: 이 리포트는 읽기 전용입니다. Meta 광고 상태, 예산, 캠페인을 변경하지 않습니다."
  );
  
  return lines.join("\n");
}

function renderMetricLine(label: string, adName: string, metrics: { spendKrw: number; impressions: number; reach: number; instagramProfileVisits: number | null; saves: number; likes: number }): string {
  return `* ${label} (${adName}): 지출 ${formatWon(metrics.spendKrw)} | 조회 ${metrics.impressions} | 도달 ${metrics.reach} | 방문 ${metrics.instagramProfileVisits ?? 0} | 저장 ${metrics.saves} | 좋아요 ${metrics.likes}`;
}

function renderWinnerBlock(review: DeathmatchReport): string {
  const s = review.score!;
  if (s.winner === "challenger") {
    return `💡 ${review.challengerAd!.name}의 압승입니다! (HS ${s.challengerHS.toFixed(1)}점 vs 100점)\n패배한 [${review.championAd.name}] 광고는 지금 즉시 OFF 처리하고, 예산을 승자에게 몰아주세요.`;
  }
  return `💡 ${review.championAd.name}이(가) 여전히 챔피언입니다! (100점 vs ${s.challengerHS.toFixed(1)}점)\n챌린저 [${review.challengerAd!.name}]가 100점을 넘지 못했으므로, 현재 챔피언을 유지합니다.`;
}

function formatKoreanDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00+09:00");
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
