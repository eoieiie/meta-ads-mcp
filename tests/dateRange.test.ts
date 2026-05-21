import test from "node:test";
import assert from "node:assert/strict";
import { currentThursdayToToday, latestCompletedThursdayToSunday } from "../src/dateRange.js";

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

test("returns current Thursday through today for manual runs on Thursday", () => {
  assert.deepEqual(currentThursdayToToday(new Date(2026, 4, 21)), {
    since: "2026-05-21",
    until: "2026-05-21"
  });
});

test("returns current Thursday through today for manual runs during the active window", () => {
  assert.deepEqual(currentThursdayToToday(new Date(2026, 4, 22)), {
    since: "2026-05-21",
    until: "2026-05-22"
  });
});

test("keeps the active window through Sunday for manual runs", () => {
  assert.deepEqual(currentThursdayToToday(new Date(2026, 4, 24)), {
    since: "2026-05-21",
    until: "2026-05-24"
  });
});

test("uses previous Thursday through today for manual runs before Thursday", () => {
  assert.deepEqual(currentThursdayToToday(new Date(2026, 4, 20)), {
    since: "2026-05-14",
    until: "2026-05-20"
  });
});
