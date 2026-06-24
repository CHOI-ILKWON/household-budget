import { AppState } from './types';
import { initialState } from './initialData';

const STORAGE_KEY = 'household_budget_v3';

export const BILLING_DAY = 25; // 25일부터 다음 달로 인식

/** 날짜 객체 → 청구 월 {year, month} */
export function getBillingMonth(date: Date): { year: number; month: number } {
  const day = date.getDate();
  const m = date.getMonth() + 1; // 1-indexed
  const y = date.getFullYear();
  if (day >= BILLING_DAY) {
    return m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  }
  return { year: y, month: m };
}

/** 청구 월의 실제 날짜 범위 (전달 25일 ~ 당월 24일) */
export function getBillingRange(year: number, month: number): { start: string; end: string } {
  let sy = year, sm = month - 1;
  if (sm === 0) { sm = 12; sy -= 1; }
  return {
    start: `${sy}-${String(sm).padStart(2, '0')}-${BILLING_DAY}`,
    end:   `${year}-${String(month).padStart(2, '0')}-24`,
  };
}

/** YYYY-MM-DD 문자열이 해당 청구 월에 속하는지 */
export function isInBillingMonth(dateStr: string, year: number, month: number): boolean {
  const { start, end } = getBillingRange(year, month);
  return dateStr >= start && dateStr <= end;
}

/** 오늘 날짜 기준 청구 월의 1일로 정규화된 Date */
export function getBillingDate(date: Date = new Date()): Date {
  const { year, month } = getBillingMonth(date);
  return new Date(year, month - 1, 1);
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return JSON.parse(raw) as AppState;
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function formatKRW(amount: number): string {
  return Math.abs(amount).toLocaleString('ko-KR') + '원';
}
