import type { TimeRange } from "./types.js";

/** 현재 시각을 Asia/Seoul (KST, UTC+9) 기준 날짜(년/월/일)로 반환 */
function kstDateNow(): Date {
  const now = new Date();
  const kstMillis = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMillis);
  return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
}

/**
 * 가장 최근에 완료된 토-금 데스매치 주차를 반환.
 * - 금요일: 오늘 끝나는 주차 반환
 * - 토요일: 어제 끝난 주차 반환
 * - 그 외: 가장 최근에 완전히 끝난 주차 반환
 * 기준 시각은 항상 KST.
 */
export function latestDeathmatchCycle(referenceDate: Date = kstDateNow()): TimeRange {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = date.getDay();
  const daysSinceFriday = (day + 2) % 7;
  const friday = addDays(date, -daysSinceFriday);
  const saturday = addDays(friday, -6);

  return { since: formatDate(saturday), until: formatDate(friday) };
}

/**
 * 현재 데스매치 주차: 가장 가까운 토요일 ~ 오늘 (KST 기준).
 * 수동 실행(워크플로우 디스패치, CLI)용.
 */
export function currentDeathmatchCycle(referenceDate: Date = kstDateNow()): TimeRange {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = date.getDay();
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
