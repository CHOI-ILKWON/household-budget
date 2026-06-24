'use client';
import { useState } from 'react';
import { Account } from '@/lib/types';

interface Props {
  nextId: number;
  onAdd: (account: Account) => void;
  onClose: () => void;
}

export default function AddAccountModal({ nextId, onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [balance, setBalance] = useState('');

  const fmtAmount = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    return n ? n.toLocaleString('ko-KR') : '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: nextId,
      name: name.trim(),
      bank: bank.trim(),
      balance: parseInt(balance.replace(/,/g, ''), 10) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-5" />
        <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-5">계좌 추가</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">계좌명</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="예: 비상금"
              className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">은행명</label>
            <input
              value={bank}
              onChange={e => setBank(e.target.value)}
              placeholder="예: 카카오뱅크"
              className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">초기 잔액</label>
            <div className="relative">
              <input
                value={balance}
                onChange={e => setBalance(fmtAmount(e.target.value))}
                inputMode="numeric"
                placeholder="0"
                className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] font-semibold pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#8E8E93]">원</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#007AFF] text-white py-3.5 rounded-2xl text-[17px] font-semibold mt-2 transition-all active:opacity-80"
          >
            추가
          </button>
        </form>
      </div>
    </div>
  );
}
