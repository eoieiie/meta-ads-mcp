import type { TimeRange } from "./types.js";

/**
 * Returns the most recently completed Saturday-to-Friday deathmatch cycle.
 * - On Friday: returns the cycle ending today (this Friday).
 * - On Saturday: returns the cycle that ended yesterday (last Friday).
 * - Any other day: returns the most recent cycle that fully ended before today.
 */
export function latestDeathmatchCycle(referenceDate = new Date()): TimeRange {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
  // days since most recent Friday (on or before referenceDate)
  const daysSinceFriday = (day + 2) % 7;
  const friday = addDays(date, -daysSinceFriday);
  const saturday = addDays(friday, -6);

  return { since: formatDate(saturday), until: formatDate(friday) };
}

/**
 * Returns the current deathmatch cycle: the most recent Saturday through today.
 * Used for manual (non-scheduled) runs.
 */
export function currentDeathmatchCycle(referenceDate = new Date()): TimeRange {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = date.getDay();
  // days since most recent Saturday (on or before referenceDate)
  const daysSinceSaturday = (day + 1) % 7;
  const saturday = addDays(date, -daysSinceSaturday);

  return { since: formatDate(saturday), until: formatDate(date) };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
