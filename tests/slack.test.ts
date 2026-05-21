import test from "node:test";
import assert from "node:assert/strict";
import { renderSlackPayload } from "../src/slack.js";

test("renders Slack payload for automatic review", () => {
  const payload = renderSlackPayload({
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
    bestAd: { id: "best-ad", name: "best" },
    candidateAd: { id: "new-ad", name: "new" },
    bestSnapshot: {
      mediaId: "best-media",
      capturedAt: "now",
      profileVisits: 72,
      follows: 5,
      reach: 939,
      views: 1278,
      deltaProfileVisits: 2,
      deltaFollows: 1,
      usedLifetimeFallback: false
    },
    candidateSnapshot: {
      mediaId: "new-media",
      capturedAt: "now",
      profileVisits: 5,
      follows: 0,
      reach: 192,
      views: 541,
      deltaProfileVisits: 5,
      deltaFollows: 0,
      usedLifetimeFallback: true
    },
    review: {
      best: {
        name: "best",
        spendKrw: 1000,
        profileVisits: 10,
        follows: 1,
        conversionRate: 0.1,
        costPerFollowKrw: 1000,
        valueScorePer1000Krw: 22,
        sampleQualified: false
      },
      candidate: {
        name: "new",
        spendKrw: 1000,
        profileVisits: 20,
        follows: 2,
        conversionRate: 0.1,
        costPerFollowKrw: 500,
        valueScorePer1000Krw: 44,
        sampleQualified: false
      },
      recommendation: "insufficient_sample",
      summary: "표본 부족",
      reasons: ["방문 수 부족"]
    }
  });

  assert.match(payload.text, /Meta Ads 리포트/);
  assert.ok(payload.blocks.length >= 4);
  const blockText = JSON.stringify(payload.blocks);
  assert.match(blockText, /best \(best-ad\)/);
  assert.match(blockText, /new \(new-ad\)/);
  assert.match(blockText, /비용 제외 lifetime 점수 132/);
  assert.doesNotMatch(blockText, /원문/);
});

test("explains zero spend in Slack metrics", () => {
  const payload = renderSlackPayload({
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
    bestAd: { id: "best-ad", name: "best" },
    candidateAd: { id: "new-ad", name: "new" },
    review: {
      best: {
        name: "best",
        spendKrw: 0,
        profileVisits: 10,
        follows: 1,
        conversionRate: 0.1,
        costPerFollowKrw: 0,
        valueScorePer1000Krw: 0,
        sampleQualified: false
      },
      candidate: {
        name: "new",
        spendKrw: 0,
        profileVisits: 20,
        follows: 2,
        conversionRate: 0.1,
        costPerFollowKrw: 0,
        valueScorePer1000Krw: 0,
        sampleQualified: false
      },
      recommendation: "insufficient_sample",
      summary: "표본 부족",
      reasons: ["방문 수 부족"]
    }
  });

  assert.match(JSON.stringify(payload.blocks), /기간 내 지출 없음 또는 Meta 반영 전/);
});
