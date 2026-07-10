'use client';
import { useState } from 'react';
import { AppState, Transaction } from '@/lib/types';
import { getBillingDate, getBillingRange, isInBillingMonth } from '@/lib/store';
import AddTransactionModal from './AddTransactionModal';
import MonthlyStatsCarousel from './MonthlyStatsCarousel';

interface Props {
  accountId: number;
  state: AppState;
  onChange: (s: AppState) => void;
  onAccountDeleted?: () => void;
}

const SL = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2">{children}</div>
);

export default function AccountTab({ accountId, state, onChange, onAccountDeleted }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState<Transaction['type']>('expense');
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [viewDate, setViewDate] = useState(() => getBillingDate());

  const bYear = viewDate.getFullYear();
  const bMonth = viewDate.getMonth() + 1;
  const { start: rangeStart, end: rangeEnd } = getBillingRange(bYear, bMonth);

  const prevMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); };
  const nextMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); };

  const account = state.accounts.find(a => a.id === accountId);
  if (!account) return null;

  const allTxs = state.transactions.filter(t => {
    if (!isInBillingMonth(t.date, bYear, bMonth)) return false;
    if (t.type === 'transfer') return t.toAccountId === accountId;
    return t.accountId === accountId;
  });

  const mInc = allTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  // "비용 제외"로 지정된 구분(예: 회사 청구 예정 출장비)은 지출 합계에서 제외
  const mExp = allTxs
    .filter(t => t.type === 'expense' && !state.nonExpenseCategories.includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
  const mTrIn = allTxs.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);

  const fixedExpenses = state.fixedExpenses.filter(f => f.accountId === accountId);

  // 계좌별 월별 지출통계 (구분별) — 위 "이번달 요약"과 동일한 청구월(bYear/bMonth)을 그대로 공유
  const accountExpenseTxs = state.transactions.filter(
    t => t.type === 'expense' && t.accountId === accountId && !state.nonExpenseCategories.includes(t.category)
  );

  const addTx = (tx: Omit<Transaction, 'id'>) => {
    const id = `tx_${Date.now()}_${Math.random()}`;
    const newAccounts = state.accounts.map(a => {
      if (tx.type === 'expense' && a.id === tx.accountId) return { ...a, balance: a.balance - tx.amount };
      if (tx.type === 'income' && a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount };
      if (tx.type === 'transfer') {
        if (a.id === tx.accountId) return { ...a, balance: a.balance - tx.amount };
        if (a.id === tx.toAccountId) return { ...a, balance: a.balance + tx.amount };
      }
      return a;
    });
    onChange({ ...state, transactions: [...state.transactions, { ...tx, id }], accounts: newAccounts });
    setShowAdd(false);
  };

  const handleEditTx = (updated: Transaction) => {
    const old = state.transactions.find(t => t.id === updated.id);
    if (!old) return;
    let newAccounts = state.accounts.map(a => {
      if (old.type === 'expense' && a.id === old.accountId) return { ...a, balance: a.balance + old.amount };
      if (old.type === 'income' && a.id === old.accountId) return { ...a, balance: a.balance - old.amount };
      if (old.type === 'transfer') {
        if (a.id === old.accountId) return { ...a, balance: a.balance + old.amount };
        if (a.id === old.toAccountId) return { ...a, balance: a.balance - old.amount };
      }
      return a;
    });
    newAccounts = newAccounts.map(a => {
      if (updated.type === 'expense' && a.id === updated.accountId) return { ...a, balance: a.balance - updated.amount };
      if (updated.type === 'income' && a.id === updated.accountId) return { ...a, balance: a.balance + updated.amount };
      if (updated.type === 'transfer') {
        if (a.id === updated.accountId) return { ...a, balance: a.balance - updated.amount };
        if (a.id === updated.toAccountId) return { ...a, balance: a.balance + updated.amount };
      }
      return a;
    });
    onChange({
      ...state,
      accounts: newAccounts,
      transactions: state.transactions.map(t => t.id === updated.id ? updated : t),
    });
    setEditTx(null);
  };

  const deleteTx = (txId: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;
    const newAccounts = state.accounts.map(a => {
      if (tx.type === 'expense' && a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount };
      if (tx.type === 'income' && a.id === tx.accountId) return { ...a, balance: a.balance - tx.amount };
      if (tx.type === 'transfer') {
        if (a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount };
        if (a.id === tx.toAccountId) return { ...a, balance: a.balance - tx.amount };
      }
      return a;
    });
    onChange({ ...state, transactions: state.transactions.filter(t => t.id !== txId), accounts: newAccounts });
  };

  const addCategory = (name: string) => {
    if (state.categories.includes(name)) return;
    onChange({ ...state, categories: [...state.categories, name] });
  };

  const handleRename = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onChange({ ...state, accounts: state.accounts.map(a => a.id === accountId ? { ...a, name: trimmed } : a) });
    setEditingName(false);
  };

  const handleDelete = () => {
    if (!window.confirm(`"${account.name}" 계좌를 삭제하시겠습니까?\n해당 계좌의 모든 거래내역도 삭제됩니다.`)) return;
    onChange({
      ...state,
      accounts: state.accounts.filter(a => a.id !== accountId),
      transactions: state.transactions.filter(t => t.accountId !== accountId && t.toAccountId !== accountId),
      fixedExpenses: state.fixedExpenses.filter(f => f.accountId !== accountId),
    });
    onAccountDeleted?.();
  };

  const actionBtns: { label: string; icon: string; type: Transaction['type'] }[] = [
    { label: '지출', icon: '↑', type: 'expense' },
    { label: '수입', icon: '↓', type: 'income' },
    { label: '이체', icon: '⇄', type: 'transfer' },
  ];

  return (
    <div className="space-y-3">
      {/* 현재 잔액 Hero */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[13px] text-[#8E8E93]">{account.bank} · {account.name}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setNewName(account.name); setEditingName(true); }}
              className="text-[11px] text-[#007AFF] font-medium"
            >이름변경</button>
            <button
              onClick={handleDelete}
              className="text-[11px] text-[#FF3B30] font-medium"
            >삭제</button>
          </div>
        </div>

        {editingName && (
          <div className="flex gap-2 mb-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              placeholder="새 계좌 이름"
              autoFocus
              className="flex-1 bg-[#F2F2F7] rounded-xl px-3 py-2 text-[14px] border-none outline-none text-[#1C1C1E]"
            />
            <button onClick={handleRename} className="text-[13px] text-white bg-[#007AFF] rounded-xl px-3 py-2 font-medium">확인</button>
            <button onClick={() => setEditingName(false)} className="text-[13px] text-[#8E8E93] bg-[#F2F2F7] rounded-xl px-3 py-2">취소</button>
          </div>
        )}

        <div className={`text-[32px] font-bold tracking-tight mt-1 ${account.balance < 0 ? 'text-[#FF3B30]' : 'text-[#1C1C1E]'}`}>
          {account.balance < 0 ? '-' : ''}{Math.abs(account.balance).toLocaleString()}
          <span className="text-[20px] font-semibold text-[#8E8E93] ml-1">원</span>
        </div>
        <div className="text-[11px] text-[#8E8E93] mt-1">현재 잔액</div>
      </div>

      {/* 지출/수입/이체 액션 버튼 */}
      <div className="grid grid-cols-3 gap-2">
        {actionBtns.map(btn => (
          <button
            key={btn.type}
            onClick={() => { setTxType(btn.type); setShowAdd(true); }}
            className="bg-[#F2F2F7] rounded-2xl py-3 flex flex-col items-center gap-1 transition-all duration-200 active:opacity-70 min-h-[64px]"
          >
            <span className="text-[20px] leading-none text-[#1C1C1E]">{btn.icon}</span>
            <span className="text-[12px] font-medium text-[#1C1C1E]">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={prevMonth} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[#F2F2F7] transition-all text-[#8E8E93]">
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="text-center min-w-[160px]">
          <div className="text-[17px] font-semibold text-[#1C1C1E]">{bYear}년 {bMonth}월</div>
          <div className="text-[10px] text-[#C7C7CC] mt-0.5">{rangeStart.slice(5)} ~ {rangeEnd.slice(5)}</div>
        </div>
        <button onClick={nextMonth} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[#F2F2F7] transition-all text-[#8E8E93]">
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 이번달 요약 */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: '수입', v: mInc, c: 'text-[#34C759]' },
          { label: '지출', v: mExp, c: 'text-[#FF3B30]' },
          { label: '이체입금', v: mTrIn, c: 'text-[#007AFF]' },
        ].map(x => (
          <div key={x.label} className="bg-[#F2F2F7] rounded-2xl p-2.5 text-center">
            <div className="text-[10px] text-[#8E8E93] leading-tight mb-0.5">{x.label}</div>
            <div className={`text-[12px] font-semibold ${x.c}`}>{x.v.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* 고정지출 (표시 전용) */}
      {fixedExpenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <SL>고정지출 (표시 전용)</SL>
          </div>
          {fixedExpenses.map(f => (
            <div key={f.id} className="flex justify-between items-center px-4 py-2.5 border-b border-[#F2F2F7] last:border-0">
              <span className="text-[13px] text-[#1C1C1E]">{f.name}</span>
              <span className="text-[13px] text-[#FF3B30]">{f.amount.toLocaleString()}원</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-2.5 bg-[#F2F2F7]">
            <span className="text-[12px] font-semibold text-[#1C1C1E]">합계</span>
            <span className="text-[12px] font-semibold text-[#FF3B30]">
              {fixedExpenses.reduce((s, f) => s + f.amount, 0).toLocaleString()}원
            </span>
          </div>
        </div>
      )}

      {/* 월별 지출통계 (구분별) — 위 월 네비게이션과 동기화, 세부 내역 펼치기 + 수정/삭제 */}
      <MonthlyStatsCarousel
        transactions={accountExpenseTxs}
        year={bYear}
        month={bMonth}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        title="월별 지출통계 (구분별)"
        onEdit={setEditTx}
        onDelete={deleteTx}
      />

      {showAdd && (
        <AddTransactionModal
          accounts={state.accounts}
          categories={state.categories}
          defaultAccountId={accountId}
          defaultType={txType}
          onAdd={addTx}
          onAddFixed={item => {
            onChange({
              ...state,
              fixedExpenses: [...state.fixedExpenses, { ...item, id: `fe_${Date.now()}` }],
            });
          }}
          onAddCategory={addCategory}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editTx && (
        <AddTransactionModal
          accounts={state.accounts}
          categories={state.categories}
          editTx={editTx}
          onAdd={addTx}
          onEdit={handleEditTx}
          onDelete={id => { deleteTx(id); setEditTx(null); }}
          onAddCategory={addCategory}
          onClose={() => setEditTx(null)}
        />
      )}
    </div>
  );
}
