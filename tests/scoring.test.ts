import test from "node:test";
import assert from "node:assert/strict";
import { calculateDeathmatchScore } from "../src/scoring.js";
import type { AdInsightsMetrics } from "../src/types.js";

function makeAd(overrides: Partial<AdInsightsMetrics>): AdInsightsMetrics {
  return {
    spendKrw: 0,
    impressions: 0,
    reach: 0,
    instagramProfileVisits: 0,
    saves: 0,
    shares: 0,
    likes: 0,
    linkClicks: 0,
    actions: [],
    raw: null,
    ...overrides,
  };
}

test("champion wins when challenger HS is below 100", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 100 });
  const challenger = makeAd({ spendKrw: 15000, instagramProfileVisits: 100, reach: 5000, saves: 50 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.winner, "champion");
  assert.equal(score.championHS, 100);
  assert.ok(score.challengerHS < 100);
});

test("challenger wins when HS exceeds 100", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 50 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 5000, saves: 100 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.winner, "challenger");
  assert.ok(score.challengerHS > 100);
});

test("champion CPPV = 0, challenger CPPV > 0 gives max costScore 120", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 0, reach: 5000, saves: 50 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 5000, saves: 50 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.championCPPV, 0);
  assert.equal(score.challengerCPPV, 50);
  assert.equal(score.costScore, 120);
});

test("both CPPV = 0 gives costScore 60", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 0, reach: 5000, saves: 50 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 0, reach: 5000, saves: 50 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.costScore, 60);
});

test("champion CPPV > 0, challenger CPPV = 0 gives costScore 0", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 50 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 0, reach: 5000, saves: 50 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.championCPPV, 100);
  assert.equal(score.challengerCPPV, 0);
  assert.equal(score.costScore, 0);
});

test("champion save rate 0 and challenger saves > 0 gives attrScore 40", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 0 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 5000, saves: 50 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.championSaveRate, 0);
  assert.equal(score.attrScore, 20);
});

test("both saves = 0 gives attrScore 0", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 0 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 5000, saves: 0 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.attrScore, 0);
});

test("challenger frequency >= 2.0 applies penalty", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 50, impressions: 10000 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 1000, saves: 50, impressions: 3000 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.challengerFrequency, 3);
  assert.equal(score.penalty, 10);
});

test("challenger higher CTR gives higher ctrScore", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 50, impressions: 10000, linkClicks: 100 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 5000, saves: 50, impressions: 5000, linkClicks: 100 });
  // champion CTR = 100/10000 = 1%, challenger CTR = 100/5000 = 2%
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.championCTR, 0.01);
  assert.equal(score.challengerCTR, 0.02);
  assert.equal(score.ctrScore, 40); // 2x better = 40 max
});

test("both CTR = 0 gives neutral ctrScore 20", () => {
  const champion = makeAd({ spendKrw: 10000, instagramProfileVisits: 100, reach: 5000, saves: 50, impressions: 10000, linkClicks: 0 });
  const challenger = makeAd({ spendKrw: 5000, instagramProfileVisits: 100, reach: 5000, saves: 50, impressions: 10000, linkClicks: 0 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.ctrScore, 20);
});

test("impressions = 0 gives CTR 0", () => {
  const champion = makeAd({ spendKrw: 0, instagramProfileVisits: 0, reach: 0, saves: 0, impressions: 0, linkClicks: 0 });
  const challenger = makeAd({ spendKrw: 0, instagramProfileVisits: 0, reach: 0, saves: 0, impressions: 0, linkClicks: 0 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.championCTR, 0);
  assert.equal(score.challengerCTR, 0);
});

test("reach = 0 gives saveRate 0 and frequency 0", () => {
  const champion = makeAd({ spendKrw: 0, instagramProfileVisits: 0, reach: 0, saves: 0 });
  const challenger = makeAd({ spendKrw: 0, instagramProfileVisits: 0, reach: 0, saves: 0 });
  const score = calculateDeathmatchScore(champion, challenger);
  assert.equal(score.championSaveRate, 0);
  assert.equal(score.championFrequency, 0);
  assert.equal(score.challengerSaveRate, 0);
  assert.equal(score.challengerFrequency, 0);
});
test("water post wins over dog plant when it has much more spend and profile visits", () => {
  const waterPost = makeAd({
    spendKrw: 19354,
    impressions: 5000,
    reach: 3000,
    instagramProfileVisits: 248,
    saves: 30,
    shares: 5,
    linkClicks: 200
  });
  const dogPlantPost = makeAd({
    spendKrw: 686,
    impressions: 500,
    reach: 450,
    instagramProfileVisits: 12,
    saves: 8,
    shares: 2,
    linkClicks: 50
  });

  const score = calculateDeathmatchScore(waterPost, dogPlantPost);
  assert.equal(score.winner, "champion");
  assert.ok(score.challengerHS < score.championHS);
});
