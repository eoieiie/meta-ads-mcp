import test from "node:test";
import assert from "node:assert/strict";
import { latestCompletedThursdayToSunday } from "../src/dateRange.js";

test("returns previous Thursday-Sunday when run on Monday", () => {
  assert.deepEqual(latestCompletedThursdayToSunday(new Date(2026, 4, 25)), {
    since: "2026-05-21",
    until: "2026-05-24"
  });
});

test("returns most recently completed Thursday-Sunday when run during current window", () => {
  assert.deepEqual(latestCompletedThursdayToSunday(new Date(2026, 4, 21)), {
    since: "2026-05-14",
    until: "2026-05-17"
  });
});

test("does not use same-day Sunday because the window is not complete", () => {
  assert.deepEqual(latestCompletedThursdayToSunday(new Date(2026, 4, 24)), {
    since: "2026-05-14",
    until: "2026-05-17"
  });
});
