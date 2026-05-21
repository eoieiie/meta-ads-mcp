import test from "node:test";
import assert from "node:assert/strict";
import { createDeltaSnapshot, upsertMediaSnapshot } from "../src/stateStore.js";

test("uses lifetime values when no previous snapshot exists", () => {
  const snapshot = createDeltaSnapshot("media-1", { profileVisits: 72, follows: 5, reach: 939, views: 1277, raw: {} }, undefined, "2026-05-21T00:00:00.000Z");

  assert.equal(snapshot.deltaFollows, 5);
  assert.equal(snapshot.deltaProfileVisits, 72);
  assert.equal(snapshot.usedLifetimeFallback, true);
});

test("calculates non-negative deltas from previous snapshot", () => {
  const snapshot = createDeltaSnapshot(
    "media-1",
    { profileVisits: 80, follows: 7, reach: 1000, views: 1300, raw: {} },
    { mediaId: "media-1", capturedAt: "old", profileVisits: 72, follows: 5, reach: 939, views: 1277 },
    "2026-05-21T00:00:00.000Z"
  );

  assert.equal(snapshot.deltaFollows, 2);
  assert.equal(snapshot.deltaProfileVisits, 8);
  assert.equal(snapshot.usedLifetimeFallback, false);
});

test("upserts media snapshots by media id", () => {
  const state = upsertMediaSnapshot(
    { version: 1, media: {} },
    { mediaId: "media-1", capturedAt: "now", profileVisits: 1, follows: 2, reach: 3, views: 4 }
  );

  assert.equal(state.media["media-1"].follows, 2);
});
