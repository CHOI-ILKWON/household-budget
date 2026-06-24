'use client';
import { useState } from 'react';

interface Props {
  monthlyGoal: number;
  annualGoal: number;
  onSave: (monthly: number, annual: number) => void;
  onClose: () => void;
}

export default function GoalModal({ monthlyGoal, annualGoal, onSave, onClose }: Props) {
  const [monthly, setMonthly] = useState(monthlyGoal.toLocaleString('ko-KR'));
  const [annual, setAnnual] = useState(annualGoal.toLocaleString('ko-KR'));

  const parse = (v: string) => parseInt(v.replace(/,/g, ''), 10) || 0;
  const fmt = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    return n ? n.toLocaleString('ko-KR') : '';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-5" />
        <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-5">저축 목표 설정</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">월간 목표</label>
            <div className="relative">
              <input
                value={monthly}
                onChange={e => setMonthly(fmt(e.target.value))}
                inputMode="numeric"
                className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] font-semibold pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#8E8E93]">원</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">연간 목표</label>
            <div className="relative">
              <input
                value={annual}
                onChange={e => setAnnual(fmt(e.target.value))}
                inputMode="numeric"
                className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] font-semibold pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#8E8E93]">원</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => { onSave(parse(monthly), parse(annual)); onClose(); }}
          className="w-full bg-[#007AFF] text-white py-3.5 rounded-2xl text-[17px] font-semibold transition-all active:opacity-80"
        >
          저장
        </button>
      </div>
    </div>
  );
}
