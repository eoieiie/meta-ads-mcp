import type { TimeRange } from "./types.js";

export function latestCompletedThursdayToSunday(referenceDate = new Date()): TimeRange {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = date.getDay();
  const daysSinceMostRecentCompletedSunday = day === 0 ? 7 : day;
  const sunday = addDays(date, -daysSinceMostRecentCompletedSunday);
  const thursday = addDays(sunday, -3);

  return {
    since: formatDate(thursday),
    until: formatDate(sunday)
  };
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
