import type { AppState } from './types';

export const initialState: AppState = {
  accounts: [
    { id: 1,  name: '일권용돈',   bank: '카뱅',    balance: 0 },
    { id: 2,  name: '마통',       bank: '국민은행', balance: 0 },
    { id: 3,  name: '보험',       bank: '우리은행', balance: 0 },
    { id: 4,  name: '디딤돌대출', bank: '농협',     balance: 0 },
    { id: 5,  name: '이머님대출', bank: '국민은행', balance: 0 },
    { id: 6,  name: '신용대출',   bank: '국민은행', balance: 0 },
    { id: 7,  name: '공과금',     bank: '농협',     balance: 0 },
    { id: 8,  name: '정가네',     bank: '카뱅',     balance: 0 },
    { id: 9,  name: '경조사',     bank: '우리은행', balance: 0 },
    { id: 10, name: '저금',       bank: '카뱅',     balance: 0 },
  ],
  transactions: [],
  fixedExpenses: [],
  categories: ['식비', '생활', '교통', '의료', '대출', '보험', '저축', '기타'],
  nonExpenseCategories: [],
  monthlyGoal: 1200000,
  annualGoal: 14400000,
};
