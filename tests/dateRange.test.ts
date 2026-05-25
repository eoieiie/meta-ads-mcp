import test from "node:test";
import assert from "node:assert/strict";
import { currentDeathmatchCycle, latestDeathmatchCycle } from "../src/dateRange.js";

// Sat-Fri deathmatch cycle:
//   May 16 (Sat) ~ May 22 (Fri) = completed cycle
//   May 23 (Sat) ~ May 29 (Fri) = current cycle

test("latestDeathmatchCycle on Friday returns the cycle ending today", () => {
  assert.deepEqual(latestDeathmatchCycle(new Date(2026, 4, 29)), {
    since: "2026-05-23",
    until: "2026-05-29"
  });
});

test("latestDeathmatchCycle on Saturday returns the cycle that ended yesterday", () => {
  assert.deepEqual(latestDeathmatchCycle(new Date(2026, 4, 30)), {
    since: "2026-05-23",
    until: "2026-05-29"
  });
});

test("latestDeathmatchCycle on Sunday returns the same cycle as Saturday", () => {
  assert.deepEqual(latestDeathmatchCycle(new Date(2026, 4, 31)), {
    since: "2026-05-23",
    until: "2026-05-29"
  });
});

test("latestDeathmatchCycle on Monday returns the previous completed cycle", () => {
  assert.deepEqual(latestDeathmatchCycle(new Date(2026, 4, 25)), {
    since: "2026-05-16",
    until: "2026-05-22"
  });
});

test("latestDeathmatchCycle on Thursday returns the previous completed cycle", () => {
  assert.deepEqual(latestDeathmatchCycle(new Date(2026, 4, 28)), {
    since: "2026-05-16",
    until: "2026-05-22"
  });
});

test("currentDeathmatchCycle on Saturday returns only that day", () => {
  assert.deepEqual(currentDeathmatchCycle(new Date(2026, 4, 23)), {
    since: "2026-05-23",
    until: "2026-05-23"
  });
});

test("currentDeathmatchCycle on Monday returns Sat-Mon", () => {
  assert.deepEqual(currentDeathmatchCycle(new Date(2026, 4, 25)), {
    since: "2026-05-23",
    until: "2026-05-25"
  });
});

test("currentDeathmatchCycle on Friday returns the full Sat-Fri cycle", () => {
  assert.deepEqual(currentDeathmatchCycle(new Date(2026, 4, 29)), {
    since: "2026-05-23",
    until: "2026-05-29"
  });
});

test("currentDeathmatchCycle before Saturday returns previous Sat window", () => {
  assert.deepEqual(currentDeathmatchCycle(new Date(2026, 4, 20)), {
    since: "2026-05-16",
    until: "2026-05-20"
  });
});
