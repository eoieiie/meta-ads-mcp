import test from "node:test";
import assert from "node:assert/strict";
import { renderSlackPayload } from "../src/slack.js";
import type { DeathmatchReport } from "../src/types.js";

function fullReport(overrides?: Partial<DeathmatchReport>): DeathmatchReport {
  return {
    timeRange: { since: "2026-05-21", until: "2026-05-24" },
    adSetId: "set-1",
    championAd: { id: "champ-ad", name: "빛" },
    challengerAd: { id: "chall-ad", name: "관리" },
    championMetrics: {
      spendKrw: 10000,
      impressions: 5000,
      reach: 3000,
      instagramProfileVisits: 100,
      saves: 50,
      shares: 5,
      likes: 30,
      actions: [],
      raw: null,
    },
    challengerMetrics: {
      spendKrw: 5000,
      impressions: 3000,
      reach: 2000,
      instagramProfileVisits: 80,
      saves: 40,
      shares: 3,
      likes: 20,
      actions: [],
      raw: null,
    },
    score: {
      championCPPV: 100,
      challengerCPPV: 62.5,
      championSaveRate: 50 / 3000,
      challengerSaveRate: 40 / 2000,
      championFrequency: 5000 / 3000,
      challengerFrequency: 3000 / 2000,
      costScore: (100 / 62.5) * 60,
      attrScore: ((40 / 2000) / (50 / 3000)) * 40,
      penalty: 0,
      challengerHS: 110,
      championHS: 100,
      winner: "challenger",
    },
    dailyRows: [
      {
        date: "2026-05-21",
        champion: { spendKrw: 2000, impressions: 1000, reach: 600, instagramProfileVisits: 20, saves: 10, shares: 1, likes: 6, actions: [], raw: null },
        challenger: { spendKrw: 1000, impressions: 600, reach: 400, instagramProfileVisits: 16, saves: 8, shares: 0, likes: 4, actions: [], raw: null },
      },
    ],
    ...overrides,
  };
}

test("renders Slack payload with score for full deathmatch report", () => {
  const report = fullReport();
  const payload = renderSlackPayload(report);

  assert.match(payload.text, /Meta Ads 리포트/);
  assert.ok(payload.blocks.length >= 6);
  const blockText = JSON.stringify(payload.blocks);
  assert.match(blockText, /챔피언/);
  assert.match(blockText, /챌린저/);
  assert.match(blockText, /기준점 100점/);
  assert.match(blockText, /점수 산출식/);
  assert.match(blockText, /일별 성과/);
});

test("renders Slack payload for single ad (no challenger, null score)", () => {
  const report = fullReport({
    challengerAd: null,
    challengerMetrics: null,
    score: null,
    dailyRows: [
      {
        date: "2026-05-21",
        champion: { spendKrw: 2000, impressions: 1000, reach: 600, instagramProfileVisits: 20, saves: 10, shares: 1, likes: 6, actions: [], raw: null },
        challenger: { spendKrw: 0, impressions: 0, reach: 0, instagramProfileVisits: 0, saves: 0, shares: 0, likes: 0, actions: [], raw: null },
      },
    ],
  });

  const payload = renderSlackPayload(report);
  assert.match(payload.text, /Meta Ads 리포트/);
  const blockText = JSON.stringify(payload.blocks);
  assert.match(blockText, /단일 광고만 운영/);
  assert.match(blockText, /챔피언/);
  assert.match(blockText, /챌린저 없음/);
});

test("includes daily lines in Slack payload", () => {
  const report = fullReport();
  const payload = renderSlackPayload(report);
  const blockText = JSON.stringify(payload.blocks);
  assert.match(blockText, /2026-05-21/);
  assert.match(blockText, /광고비/);
  assert.match(blockText, /방문/);
  assert.match(blockText, /저장/);
  assert.match(blockText, /도달/);
});

test("shows zero spend explanation when spend is 0", () => {
  const report = fullReport({
    championMetrics: { spendKrw: 0, impressions: 0, reach: 0, instagramProfileVisits: 0, saves: 0, shares: 0, likes: 0, actions: [], raw: null },
    challengerMetrics: { spendKrw: 0, impressions: 0, reach: 0, instagramProfileVisits: 0, saves: 0, shares: 0, likes: 0, actions: [], raw: null },
    score: {
      championCPPV: 0,
      challengerCPPV: 0,
      championSaveRate: 0,
      challengerSaveRate: 0,
      championFrequency: 0,
      challengerFrequency: 0,
      costScore: 60,
      attrScore: 0,
      penalty: 0,
      challengerHS: 60,
      championHS: 100,
      winner: "champion",
    },
  });

  const payload = renderSlackPayload(report);
  const blockText = JSON.stringify(payload.blocks);
  assert.match(blockText, /0원/);
});
