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
  monthlyGoal: number;
  annualGoal: number;
}
