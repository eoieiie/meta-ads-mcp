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

  // --- Frequency ---
  const championFrequency = champion.reach === 0 ? 0 : champion.impressions / champion.reach;
  const challengerFrequency = challenger.reach === 0 ? 0 : challenger.impressions / challenger.reach;

  // --- CostScore ---
  let costScore: number;
  if (championCPPV === 0 && challengerCPPV === 0) {
    costScore = 60;
  } else if (championCPPV === 0 && challengerCPPV > 0) {
    costScore = 120;
  } else if (championCPPV > 0 && challengerCPPV === 0) {
    costScore = 0;
  } else {
    costScore = Math.min((championCPPV / challengerCPPV) * 60, 120);
  }

  // --- AttrScore ---
  let attrScore: number;
  if (championSaveRate > 0) {
    attrScore = Math.min((challengerSaveRate / championSaveRate) * 40, 80);
  } else {
    // championSaveRate === 0
    attrScore = (challenger.saves + challenger.shares) > 0 ? 40 : 0;
  }

  // --- Penalty ---
  const penalty = challengerFrequency >= 2.0 ? (challengerFrequency - 2.0) * 10 : 0;

  // --- HS (Health Score) ---
  const challengerHS = costScore + attrScore - penalty;
  const championHS = 100;

  // --- Winner ---
  const winner = challengerHS > championHS ? "challenger" : "champion";

  return {
    championCPPV,
    challengerCPPV,
    championSaveRate,
    challengerSaveRate,
    championFrequency,
    challengerFrequency,
    costScore,
    attrScore,
    penalty,
    challengerHS,
    championHS,
    winner,
  };
}
