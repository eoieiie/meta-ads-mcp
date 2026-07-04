import type { AdInsightsMetrics, DeathmatchScore } from "./types.js";

export function calculateDeathmatchScore(
  champion: AdInsightsMetrics,
  challenger: AdInsightsMetrics
): DeathmatchScore {
  // --- CPPV (Cost Per Profile Visit) ---
  const championCPPV =
    champion.instagramProfileVisits === 0 || champion.instagramProfileVisits === null
      ? 0
      : champion.spendKrw / champion.instagramProfileVisits;
  const challengerCPPV =
    challenger.instagramProfileVisits === 0 || challenger.instagramProfileVisits === null
      ? 0
      : challenger.spendKrw / challenger.instagramProfileVisits;

  // --- SaveShareRate (저장 + 공유) ---
  const championSaveRate = champion.reach === 0 ? 0 : (champion.saves + champion.shares) / champion.reach;
  const challengerSaveRate = challenger.reach === 0 ? 0 : (challenger.saves + challenger.shares) / challenger.reach;

  // --- CTR (Click-Through Rate) ---
  const championCTR = champion.impressions === 0 ? 0 : champion.linkClicks / champion.impressions;
  const challengerCTR = challenger.impressions === 0 ? 0 : challenger.linkClicks / challenger.impressions;

  // --- Frequency ---
  const championFrequency = champion.reach === 0 ? 0 : champion.impressions / champion.reach;
  const challengerFrequency = challenger.reach === 0 ? 0 : challenger.impressions / challenger.reach;

  // --- CostScore (방문단가 점수, max 120) ---
  let costScore: number;
  if (championCPPV === 0 && challengerCPPV === 0) {
    costScore = 60;
  } else if (championCPPV === 0 && challengerCPPV > 0) {
    costScore = 120;
  } else if (championCPPV > 0 && challengerCPPV === 0) {
    costScore = 0;
  } else {
    const championVisits = champion.instagramProfileVisits ?? 0;
    const challengerVisits = challenger.instagramProfileVisits ?? 0;
    const visitVolumeFactor = Math.min(challengerVisits / championVisits, 1);
    costScore = Math.min((championCPPV / challengerCPPV) * 60 * visitVolumeFactor, 120);
  }

  // --- AttrScore (매력도 점수, max 40) ---
  let attrScore: number;
  if (championSaveRate > 0) {
    attrScore = Math.min((challengerSaveRate / championSaveRate) * 20, 40);
  } else {
    attrScore = (challenger.saves + challenger.shares) > 0 ? 20 : 0;
  }

  // --- CTRScore (클릭률 점수, max 40) ---
  let ctrScore: number;
  if (championCTR === 0 && challengerCTR === 0) {
    ctrScore = 20;
  } else if (championCTR === 0 && challengerCTR > 0) {
    ctrScore = 40;
  } else if (championCTR > 0 && challengerCTR === 0) {
    ctrScore = 0;
  } else {
    ctrScore = Math.min((challengerCTR / championCTR) * 20, 40);
  }

  // --- Penalty (광고피로도 차감) ---
  const penalty = challengerFrequency >= 2.0 ? (challengerFrequency - 2.0) * 10 : 0;

  // --- HS (Health Score) ---
  const challengerHS = costScore + attrScore + ctrScore - penalty;
  const championHS = 100;

  // --- Winner ---
  const winner = challengerHS > championHS ? "challenger" : "champion";

  return {
    championCPPV,
    challengerCPPV,
    championSaveRate,
    challengerSaveRate,
    championCTR,
    challengerCTR,
    championFrequency,
    challengerFrequency,
    costScore,
    attrScore,
    ctrScore,
    penalty,
    challengerHS,
    championHS,
    winner,
  };
}
