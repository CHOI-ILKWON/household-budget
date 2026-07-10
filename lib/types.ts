export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Account {
  id: number;
  name: string;
  bank: string;
  balance: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  accountId: number;
  toAccountId?: number;
  category: string;
  amount: number;
  note: string;
  // 생성/수정 시점에 구분이 "비용 제외"였는지 저장해둔다. 이후 구분의 비용 제외 여부가 바뀌어도
  // 이미 만들어진 거래의 잔액 반영 여부는 그대로 유지되어야 하므로(수정/삭제 시 되돌릴 때 필요) 매번
  // 다시 계산하지 않고 이 값을 그대로 사용한다.
  excludedFromBalance?: boolean;
  // 보험료·대출원리금처럼 정기적으로 나가는 고정비인지 여부. 구분(카테고리)과 무관하게 거래
  // 하나하나에 붙는 속성이다 (같은 구분 안에도 고정비/비고정비가 섞일 수 있어서).
  isFixed?: boolean;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  accountId: number;
}

export interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  categories: string[];
  nonExpenseCategories: string[]; // 이 구분에 속한 지출은 실제 비용이 아니므로(예: 회사 청구 예정) 지출 합계/통계에서 제외
  monthlyGoal: number;
  annualGoal: number;
}
