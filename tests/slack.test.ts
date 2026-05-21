import test from "node:test";
import assert from "node:assert/strict";
import { renderSlackPayload } from "../src/slack.js";
import { scoreCardNews } from "../src/scoring.js";

test("renders Slack payload for automatic review", () => {
  const payload = renderSlackPayload({
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
    bestAd: { id: "best-ad", name: "best" },
    candidateAd: { id: "new-ad", name: "new" },
    bestLifecycle: scoreCardNews({ name: "best", spendKrw: 2000, profileVisits: 20, follows: 2, saves: 3, shares: 1 }),
    candidateLifecycle: scoreCardNews({ name: "new", spendKrw: 1000, profileVisits: 20, follows: 2, saves: 4, shares: 2 }),
    bestRecent: scoreCardNews({ name: "best", spendKrw: 1000, profileVisits: 10, follows: 1, saves: 3, shares: 1 }),
    candidateRecent: scoreCardNews({ name: "new", spendKrw: 1000, profileVisits: 20, follows: 2, saves: 4, shares: 2 }),
    dailyRows: [],
    otherAds: [],
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
      best: scoreCardNews({ name: "best", spendKrw: 1000, profileVisits: 10, follows: 1, saves: 3, shares: 1 }),
      candidate: scoreCardNews({ name: "new", spendKrw: 1000, profileVisits: 20, follows: 2, saves: 4, shares: 2 }),
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
  assert.match(blockText, /저장 3/);
  assert.doesNotMatch(blockText, /원문/);
  assert.doesNotMatch(blockText, /누적 lifetime/);
  assert.match(blockText, /전체 기간 게시글별 점수/);
  assert.match(blockText, /비교 방식 설명/);
});

test("explains zero spend in Slack metrics", () => {
  const payload = renderSlackPayload({
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
    bestAd: { id: "best-ad", name: "best" },
    candidateAd: { id: "new-ad", name: "new" },
    bestLifecycle: scoreCardNews({ name: "best", spendKrw: 0, profileVisits: 10, follows: 1 }),
    candidateLifecycle: scoreCardNews({ name: "new", spendKrw: 0, profileVisits: 20, follows: 2 }),
    bestRecent: scoreCardNews({ name: "best", spendKrw: 0, profileVisits: 10, follows: 1 }),
    candidateRecent: scoreCardNews({ name: "new", spendKrw: 0, profileVisits: 20, follows: 2 }),
    dailyRows: [],
    otherAds: [],
    review: {
      best: scoreCardNews({ name: "best", spendKrw: 0, profileVisits: 10, follows: 1 }),
      candidate: scoreCardNews({ name: "new", spendKrw: 0, profileVisits: 20, follows: 2 }),
      recommendation: "insufficient_sample",
      summary: "표본 부족",
      reasons: ["방문 수 부족"]
    }
  });

  assert.match(JSON.stringify(payload.blocks), /기간 내 지출 없음 또는 Meta 반영 전/);
});
