import { AppState, Transaction } from './types';
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
    // 기존에 저장된 데이터에 없는 필드(예: 새로 추가된 nonExpenseCategories)는 기본값으로 채운다.
    const merged = { ...initialState, ...(JSON.parse(raw) as Partial<AppState>) } as AppState;
    const reconciled = reconcileBalances(merged);
    // 구분의 "비용 제외" 설정이 바뀐 뒤 앱을 새로고침하지 않고 방치된 경우에도, 열 때마다
    // 자동으로 잔액을 현재 설정에 맞게 바로잡고 그 결과를 저장해둔다.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled));
    return reconciled;
  } catch {
    return initialState;
  }
}

/**
 * 모든 지출 거래를 현재 nonExpenseCategories 설정과 비교해, 저장된 excludedFromBalance 값이
 * 어긋난 거래(구분을 나중에 "비용 제외"로 켜거나 끈 뒤 앱을 새로고침하지 않고 방치된 경우 등)를
 * 찾아 계좌 잔액에 그 차이를 되돌려주고 플래그도 현재 설정에 맞게 다시 저장한다.
 */
export function reconcileBalances(state: AppState): AppState {
  const balanceDeltas = new Map<number, number>();
  const transactions = state.transactions.map(t => {
    if (t.type !== 'expense') return t;
    const shouldExclude = state.nonExpenseCategories.includes(t.category);
    const wasExcluded = !!t.excludedFromBalance;
    if (shouldExclude === wasExcluded) return t;
    const delta = shouldExclude ? t.amount : -t.amount;
    balanceDeltas.set(t.accountId, (balanceDeltas.get(t.accountId) ?? 0) + delta);
    return { ...t, excludedFromBalance: shouldExclude };
  });
  if (balanceDeltas.size === 0) return { ...state, transactions };
  const accounts = state.accounts.map(a =>
    balanceDeltas.has(a.id) ? { ...a, balance: a.balance + (balanceDeltas.get(a.id) ?? 0) } : a
  );
  return { ...state, transactions, accounts };
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * 거래를 새로 만들거나 구분을 바꿀 때, 그 시점의 "비용 제외" 설정에 따라 이 거래가 잔액에
 * 반영돼야 하는지를 결정한다. 이렇게 결정된 값은 Transaction.excludedFromBalance에 저장해두고,
 * 이후 수정/삭제 시에는 (구분의 비용 제외 설정이 바뀌었더라도) 저장된 값을 그대로 사용해야
 * 잔액이 어긋나지 않는다.
 */
export function isExcludedFromBalance(tx: Pick<Transaction, 'type' | 'category'>, nonExpenseCategories: string[]): boolean {
  return tx.type === 'expense' && nonExpenseCategories.includes(tx.category);
}

/** 거래에 저장된 excludedFromBalance 값을 기준으로 잔액에 반영해야 하는 지출인지 판단한다 */
export function affectsBalance(tx: Pick<Transaction, 'type' | 'excludedFromBalance'>): boolean {
  return !(tx.type === 'expense' && tx.excludedFromBalance);
}

export function formatKRW(amount: number): string {
  return Math.abs(amount).toLocaleString('ko-KR') + '원';
}
