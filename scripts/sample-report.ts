import { calculateDeathmatchScore } from "../src/scoring.js";
import type { AdInsightsMetrics } from "../src/types.js";

const champion: AdInsightsMetrics = {
  spendKrw: 19354,
  impressions: 5000,
  reach: 3000,
  instagramProfileVisits: 248,
  saves: 30,
  shares: 5,
  likes: 50,
  actions: [],
  raw: null,
};

const challenger: AdInsightsMetrics = {
  spendKrw: 686,
  impressions: 500,
  reach: 450,
  instagramProfileVisits: 12,
  saves: 8,
  shares: 2,
  likes: 15,
  actions: [],
  raw: null,
};

const score = calculateDeathmatchScore(champion, challenger);
console.log("=== Deathmatch Score Sample ===");
console.log(JSON.stringify(score, null, 2));
