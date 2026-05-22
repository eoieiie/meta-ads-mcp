import type { AutoCardNewsReview, CardNewsReview, OtherAdWithRecent, ScoredCardNews } from "./types.js";

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
  const stripPrefix = (name: string) => name.replace(/^grdn_참여_20260410[\s_-]*/, "");
  const allPosts: Array<ScoredCardNews & { _marker: string }> = [
    { ...autoReview.bestLifecycle, _marker: "★BEST" },
  ];
  if (autoReview.candidateLifecycle) {
    allPosts.push({ ...autoReview.candidateLifecycle, _marker: "★NEW" });
  }
  allPosts.push(...autoReview.otherAds.map((a) => ({ ...a, _marker: "" })));
  allPosts.sort((a, b) => b.score - a.score);
  const allPostsLines = allPosts.map((p, i) => {
    const marker = p._marker;
    return `${i + 1}. ${stripPrefix(p.name)}${marker ? ` ${marker}` : ""}: 방문 효율 ${p.score.toFixed(2)} (방문 ${p.profileVisits}, ${formatWon(p.spendKrw)})`;
  });
  const otherRecentLines = autoReview.otherAds.length > 0
    ? ["", "기타 게시글 최근 성과", ...autoReview.otherAds.map((ad) => {
        const r = ad.recent;
        const deltaPct = ad.score !== 0 ? ((r.score - ad.score) / ad.score * 100).toFixed(1) : "-";
        const sign = r.score > ad.score ? "+" : r.score < ad.score ? "" : "";
        return `  ${stripPrefix(ad.name)}: 방문 효율 ${r.score.toFixed(2)} (저장 ${r.saves ?? 0} | 공유 ${r.shares ?? 0} | 좋아요 ${r.likes ?? 0}) | ${sign}${deltaPct !== "-0.0" ? deltaPct + "%" : "-"}`;
      })]
    : [];
  const period = `${autoReview.timeRange.since} ~ ${autoReview.timeRange.until}`;
  const hasCandidate = !!autoReview.candidateAd;

  const lines: string[] = [
    `평가 기간: ${autoReview.timeRange.since} ~ ${autoReview.timeRange.until}`,
    `기존 베스트 광고: ${autoReview.bestAd.name} (${autoReview.bestAd.id})`,
  ];
  if (hasCandidate) {
    lines.push(`신규 후보 광고: ${autoReview.candidateAd!.name} (${autoReview.candidateAd!.id})`);
  } else {
    lines.push("T세트: 신규 게시글 없음");
  }
  lines.push(
    "",
    "전체 기간: 기존 best",
    renderScoredLine("기존 best 전체", autoReview.bestLifecycle),
  );
  if (autoReview.candidateLifecycle) {
    lines.push(renderScoredLine("신규 게시글 전체", autoReview.candidateLifecycle));
  }
  lines.push(
    "",
    "핵심 반응 (최근)",
    `  저장 ${autoReview.bestRecent.saves} | 공유 ${autoReview.bestRecent.shares} | 좋아요 ${autoReview.bestRecent.likes} (기존 best)`,
  );
  if (hasCandidate && autoReview.candidateRecent) {
    lines.push(`  저장 ${autoReview.candidateRecent.saves} | 공유 ${autoReview.candidateRecent.shares} | 좋아요 ${autoReview.candidateRecent.likes} (신규 게시글)`);
  }
  lines.push(
    "",
    "동일 기간 기준",
    renderScoredLine("기존 best 최근", autoReview.bestRecent),
  );
  if (hasCandidate && autoReview.candidateRecent) {
    lines.push(renderScoredLine("신규 게시글", autoReview.candidateRecent));
  }
  lines.push(
    "",
    "전체 기간 게시글별 점수",
    ...allPostsLines,
    ...otherRecentLines,
    "",
    "비교 방식 설명",
    `- 동일 기간: 두 게시글이 각자의 세트에서 동시 운영된 ${period} 데이터로 비교`,
    "- 방문 효율 = 방문 / 광고비 x 100 (광고비 차이를 정규화한 효율 지표)",
    "- 전체 기간 점수는 참고용 (해당 게시글이 광고에 사용된 전체 기간의 누적 효율)",
    "",
    "일별 성과",
    ...autoReview.dailyRows.map((row) => {
      const best = `best 광고비 ${formatWon(row.best.spendKrw)}, 방문 ${row.best.instagramProfileVisits ?? 0}, 저장 ${row.best.saves}, 공유 ${row.best.shares}, 좋아요 ${row.best.likes}`;
      const candidate = hasCandidate
        ? ` / 신규 광고비 ${formatWon(row.candidate.spendKrw)}, 방문 ${row.candidate.instagramProfileVisits ?? 0}, 저장 ${row.candidate.saves}, 공유 ${row.candidate.shares}, 좋아요 ${row.candidate.likes}`
        : "";
      return `- ${row.date}: ${best}${candidate}`;
    }),
  );
  if (hasCandidate && autoReview.review) {
    lines.push("", renderCardNewsReview(autoReview.review));
  }

  return lines.join("\n");
}

function renderScoredLine(label: string, item: ScoredCardNews): string {
  return `- ${label}(${item.name}): 방문 효율 ${item.score.toFixed(2)} = 방문 ${item.profileVisits} ÷ ${formatWon(item.spendKrw)} | 저장 ${item.saves ?? 0} | 공유 ${item.shares ?? 0} | 좋아요 ${item.likes ?? 0}`;
}

function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
