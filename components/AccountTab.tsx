'use client';
import { useState } from 'react';
import { AppState, Transaction } from '@/lib/types';
import { getBillingDate, isInBillingMonth } from '@/lib/store';
import AddTransactionModal from './AddTransactionModal';

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
  const [viewDate] = useState(() => getBillingDate());
  const bYear = viewDate.getFullYear();
  const bMonth = viewDate.getMonth() + 1;

  const account = state.accounts.find(a => a.id === accountId);
  if (!account) return null;

  const allTxs = state.transactions.filter(t => {
    if (!isInBillingMonth(t.date, bYear, bMonth)) return false;
    if (t.type === 'transfer') return t.toAccountId === accountId;
    return t.accountId === accountId;
  });
  const sorted = [...allTxs].sort((a, b) => b.date.localeCompare(a.date));

  const mInc = allTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const mExp = allTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const mTrIn = allTxs.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);

  const fixedExpenses = state.fixedExpenses.filter(f => f.accountId === accountId);

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

  const getTxDisplay = (t: Transaction) => {
    if (t.type === 'income') return {
      label: t.note || t.category,
      sub: t.category,
      amount: `+${t.amount.toLocaleString()}`,
      color: 'text-[#34C759]',
    };
    if (t.type === 'expense') return {
      label: t.note || t.category,
      sub: t.category,
      amount: `-${t.amount.toLocaleString()}`,
      color: 'text-[#FF3B30]',
    };
    const fromAcc = state.accounts.find(a => a.id === t.accountId);
    return {
      label: t.note || '이체입금',
      sub: `← ${fromAcc?.name ?? ''}`,
      amount: `+${t.amount.toLocaleString()}`,
      color: 'text-[#007AFF]',
    };
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

      {/* 고정지출 */}
      {fixedExpenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <SL>고정지출</SL>
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

      {/* 거래 내역 */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <SL>{bMonth}월 거래내역</SL>
        </div>
        {sorted.length === 0 ? (
          <div className="text-[12px] text-[#C7C7CC] text-center py-10">내역 없음</div>
        ) : sorted.map(t => {
          const d = getTxDisplay(t);
          return (
            <div
              key={t.id}
              className="flex justify-between items-center px-4 py-3 border-b border-[#F2F2F7] last:border-0 group cursor-pointer active:bg-[#F2F2F7]"
              onClick={() => setEditTx(t)}
            >
              <div>
                <div className="text-[13px] text-[#1C1C1E]">{d.label}</div>
                <div className="text-[11px] text-[#8E8E93]">{t.date.slice(5)} · {d.sub}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-semibold ${d.color}`}>{d.amount}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteTx(t.id); }}
                  className="text-[10px] text-[#C7C7CC] opacity-0 group-hover:opacity-100 transition-opacity"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <AddTransactionModal
          accounts={state.accounts}
          categories={state.categories}
          defaultAccountId={accountId}
          defaultType={txType}
          onAdd={addTx}
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
          onClose={() => setEditTx(null)}
        />
      )}
    </div>
  );
}
