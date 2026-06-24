'use client';
import { useState } from 'react';
import { FixedExpense, Account, Transaction } from '@/lib/types';

interface Props {
  fixedExpenses: FixedExpense[];
  accounts: Account[];
  onUpdate: (expenses: FixedExpense[]) => void;
  onApply: (txs: Omit<Transaction, 'id'>[]) => void;
  onClose: () => void;
}

export default function FixedExpenseSheet({ fixedExpenses, accounts, onUpdate, onApply, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAccountId, setEditAccountId] = useState<number>(accounts[0]?.id ?? 1);

  const fmtAmount = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    return n ? n.toLocaleString('ko-KR') : '';
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    const num = parseInt(amount.replace(/,/g, ''), 10);
    if (!trimmed || !num) return;
    onUpdate([...fixedExpenses, { id: `fe_${Date.now()}`, name: trimmed, amount: num, accountId }]);
    setName('');
    setAmount('');
  };

  const handleDelete = (id: string) => {
    onUpdate(fixedExpenses.filter(f => f.id !== id));
  };

  const startEdit = (f: FixedExpense) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditAmount(f.amount.toLocaleString('ko-KR'));
    setEditAccountId(f.accountId);
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    const num = parseInt(editAmount.replace(/,/g, ''), 10);
    if (!trimmed || !num || !editingId) return;
    onUpdate(fixedExpenses.map(f =>
      f.id === editingId ? { ...f, name: trimmed, amount: num, accountId: editAccountId } : f
    ));
    setEditingId(null);
  };

  const handleApply = () => {
    if (fixedExpenses.length === 0) return;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const txs: Omit<Transaction, 'id'>[] = fixedExpenses.map(f => ({
      date: today,
      type: 'expense' as const,
      accountId: f.accountId,
      category: '고정지출',
      amount: f.amount,
      note: f.name,
    }));
    onApply(txs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-3">
          <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-5" />
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">고정지출 관리</h2>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-6">
          {fixedExpenses.length === 0 ? (
            <div className="text-[12px] text-[#C7C7CC] text-center py-8">등록된 고정지출이 없습니다</div>
          ) : fixedExpenses.map(f => {
            const acc = accounts.find(a => a.id === f.accountId);
            if (editingId === f.id) {
              return (
                <div key={f.id} className="py-3 border-b border-[#F2F2F7] last:border-0 space-y-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-[14px] border-none outline-none w-full text-[#1C1C1E]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        value={editAmount}
                        onChange={e => setEditAmount(fmtAmount(e.target.value))}
                        inputMode="numeric"
                        className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-[14px] border-none outline-none w-full text-[#1C1C1E] font-semibold pr-7"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#8E8E93]">원</span>
                    </div>
                    <select
                      value={editAccountId}
                      onChange={e => setEditAccountId(Number(e.target.value))}
                      className="bg-[#F2F2F7] rounded-xl px-2 py-2 text-[13px] border-none outline-none w-full text-[#1C1C1E] appearance-none"
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 bg-[#007AFF] text-white rounded-xl py-2 text-[13px] font-semibold">저장</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-[#F2F2F7] text-[#8E8E93] rounded-xl py-2 text-[13px]">취소</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={f.id} className="flex items-center justify-between py-3 border-b border-[#F2F2F7] last:border-0">
                <div className="min-w-0">
                  <div className="text-[14px] text-[#1C1C1E]">{f.name}</div>
                  {acc && <div className="text-[11px] text-[#8E8E93]">{acc.name}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[14px] text-[#FF3B30] font-semibold">{f.amount.toLocaleString()}원</span>
                  <button
                    onClick={() => startEdit(f)}
                    className="text-[12px] text-[#007AFF] font-medium"
                  >수정</button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="text-[12px] text-[#FF3B30] font-medium"
                  >삭제</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 추가 폼 */}
        <div className="p-6 pt-4 border-t border-[#F2F2F7] space-y-3">
          <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold">새 항목 추가</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="항목명 (예: 보험료)"
            className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E]"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                value={amount}
                onChange={e => setAmount(fmtAmount(e.target.value))}
                inputMode="numeric"
                placeholder="금액"
                className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] font-semibold pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8E8E93]">원</span>
            </div>
            <select
              value={accountId}
              onChange={e => setAccountId(Number(e.target.value))}
              className="bg-[#F2F2F7] rounded-xl px-3 py-3 text-[14px] border-none outline-none w-full text-[#1C1C1E] appearance-none"
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-[#007AFF] text-white py-3 rounded-2xl text-[15px] font-semibold transition-all active:opacity-80"
          >추가</button>

          {fixedExpenses.length > 0 && (
            <button
              onClick={handleApply}
              className="w-full bg-[#FF3B30] text-white py-3.5 rounded-2xl text-[17px] font-semibold transition-all active:opacity-80"
            >
              오늘 날짜로 일반지출에 적용 ({fixedExpenses.reduce((s, f) => s + f.amount, 0).toLocaleString()}원)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
