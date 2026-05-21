import test from "node:test";
import assert from "node:assert/strict";
import { reviewCardNews, scoreCardNews } from "../src/scoring.js";

test("scores 방문 효율 = 방문/광고비*100", () => {
  const scored = scoreCardNews({ name: "빛", spendKrw: 19354, profileVisits: 248 });

  assert.equal(scored.score.toFixed(2), "1.28");
  assert.equal(scored.profileVisits, 248);
});

test("candidate clears switch criteria with score, conversion, and visits", () => {
  const review = reviewCardNews(
    { name: "빛", spendKrw: 19354, profileVisits: 248 },
    { name: "관리", spendKrw: 686, profileVisits: 12 }
  );

  assert.equal(review.recommendation, "strong_replace");
});

test("strongly recommends candidate when score is higher and visits >= 10", () => {
  const review = reviewCardNews(
    { name: "기존", spendKrw: 20000, profileVisits: 200 },
    { name: "신규", spendKrw: 10000, profileVisits: 150 }
  );

  assert.equal(review.recommendation, "strong_replace");
});
