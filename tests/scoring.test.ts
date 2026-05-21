import test from "node:test";
import assert from "node:assert/strict";
import { reviewCardNews, scoreCardNews } from "../src/scoring.js";

test("scores card-news metrics with follow weight over spend", () => {
  const scored = scoreCardNews({ name: "빛", spendKrw: 19354, profileVisits: 248, follows: 32 });

  assert.equal(scored.score.toFixed(2), "3.27");
  assert.equal(scored.conversionRate.toFixed(3), "0.129");
});

test("candidate clears switch criteria with score, conversion, and visits", () => {
  const review = reviewCardNews(
    { name: "빛", spendKrw: 19354, profileVisits: 248, follows: 32 },
    { name: "관리", spendKrw: 686, profileVisits: 12, follows: 6 }
  );

  assert.equal(review.recommendation, "strong_replace");
});

test("strongly recommends candidate only when it clears sample, conversion, and margin", () => {
  const review = reviewCardNews(
    { name: "기존", spendKrw: 20000, profileVisits: 200, follows: 20 },
    { name: "신규", spendKrw: 10000, profileVisits: 100, follows: 20 }
  );

  assert.equal(review.recommendation, "strong_replace");
});
