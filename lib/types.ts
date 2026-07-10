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
