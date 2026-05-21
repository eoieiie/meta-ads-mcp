import test from "node:test";
import assert from "node:assert/strict";
import { selectActiveAd } from "../src/autoReview.js";

test("selects the active ad from an ad set", () => {
  const selected = selectActiveAd(
    [
      { id: "1", name: "old", effectiveStatus: "PAUSED", updatedTime: "2026-05-20T00:00:00+0900" },
      { id: "2", name: "active", effectiveStatus: "ACTIVE", updatedTime: "2026-05-19T00:00:00+0900" }
    ],
    "test"
  );

  assert.equal(selected.id, "2");
});

test("falls back to the most recently updated ad when none are active", () => {
  const selected = selectActiveAd(
    [
      { id: "1", name: "older", effectiveStatus: "PAUSED", updatedTime: "2026-05-19T00:00:00+0900" },
      { id: "2", name: "newer", effectiveStatus: "PAUSED", updatedTime: "2026-05-20T00:00:00+0900" }
    ],
    "test"
  );

  assert.equal(selected.id, "2");
});
