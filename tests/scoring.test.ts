import test from "node:test";
import assert from "node:assert/strict";
import { reviewCardNews, scoreCardNews } from "../src/scoring.js";

test("scores card-news metrics with follow weight per 1,000 KRW", () => {
  const scored = scoreCardNews({ name: "빛", spendKrw: 19354, profileVisits: 248, follows: 32 });

  assert.equal(scored.valueScorePer1000Krw.toFixed(2), "32.65");
  assert.equal(scored.conversionRate.toFixed(3), "0.129");
});

test("blocks high score candidate when sample is too small", () => {
  const review = reviewCardNews(
    { name: "빛", spendKrw: 19354, profileVisits: 248, follows: 32 },
    { name: "관리", spendKrw: 686, profileVisits: 12, follows: 6 }
  );

  assert.equal(review.recommendation, "insufficient_sample");
});

test("strongly recommends candidate only when it clears sample, conversion, and margin", () => {
  const review = reviewCardNews(
    { name: "기존", spendKrw: 20000, profileVisits: 200, follows: 20 },
    { name: "신규", spendKrw: 10000, profileVisits: 100, follows: 20 }
  );

  assert.equal(review.recommendation, "strong_replace");
});
