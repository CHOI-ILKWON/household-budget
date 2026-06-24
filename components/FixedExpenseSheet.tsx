'use client';
import { useState } from 'react';
import { FixedExpense, Account } from '@/lib/types';

interface Props {
  fixedExpenses: FixedExpense[];
  accounts: Account[];
  onUpdate: (expenses: FixedExpense[]) => void;
  onClose: () => void;
}

export default function FixedExpenseSheet({ fixedExpenses, accounts, onUpdate, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 1);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '80vh' }}
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
            return (
              <div key={f.id} className="flex items-center justify-between py-3 border-b border-[#F2F2F7] last:border-0">
                <div className="min-w-0">
                  <div className="text-[14px] text-[#1C1C1E]">{f.name}</div>
                  {acc && <div className="text-[11px] text-[#8E8E93]">{acc.id}. {acc.name}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[14px] text-[#FF3B30] font-semibold">{f.amount.toLocaleString()}원</span>
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
              {accounts.map(a => <option key={a.id} value={a.id}>{a.id}. {a.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-[#007AFF] text-white py-3.5 rounded-2xl text-[17px] font-semibold transition-all active:opacity-80"
          >추가</button>
        </div>
      </div>
    </div>
  );
}
