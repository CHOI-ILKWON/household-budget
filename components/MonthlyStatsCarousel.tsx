'use client';
import { useRef, useState } from 'react';
import { Account, Transaction } from '@/lib/types';
import { getBillingMonth, getBillingRange, isInBillingMonth } from '@/lib/store';

const DOT_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55',
];

function CategoryRow({
  cat, amount, color, pct, muted, isOpen, onToggle, items, accounts, onEdit, onDelete,
}: {
  cat: string; amount: number; color: string; pct?: number; muted?: boolean;
  isOpen: boolean; onToggle: () => void; items: Transaction[];
  accounts?: Account[]; onEdit?: (tx: Transaction) => void; onDelete?: (id: string) => void;
}) {
  return (
    <div>
      <button className="w-full text-left" onClick={onToggle}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className={`text-[13px] ${muted ? 'text-[#8E8E93]' : 'text-[#1C1C1E]'}`}>{cat}</span>
            {muted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF9500] text-white font-medium">제외</span>}
            <span className="text-[10px] text-[#8E8E93]">{isOpen ? '▲' : '▼'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[13px] font-semibold ${muted ? 'text-[#8E8E93]' : 'text-[#1C1C1E]'}`}>{amount.toLocaleString()}원</span>
            {pct !== undefined && <span className="text-[11px] text-[#8E8E93] w-8 text-right">{pct}%</span>}
          </div>
        </div>
        {pct !== undefined && (
          <div className="w-full bg-[#F2F2F7] rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
          </div>
        )}
      </button>
      {isOpen && (
        <div className="mt-2 ml-4 rounded-xl overflow-hidden border border-[#F2F2F7]">
          {items.map(t => {
            const acc = accounts?.find(a => a.id === t.accountId);
            return (
              <div
                key={t.id}
                className={`flex justify-between items-center px-3 py-2 bg-[#F9F9F9] border-b border-[#F2F2F7] last:border-0 group ${onEdit ? 'cursor-pointer active:bg-[#F2F2F7]' : ''}`}
                onClick={() => onEdit?.(t)}
              >
                <div>
                  <div className="text-[12px] text-[#1C1C1E]">{t.note || t.category}</div>
                  <div className="text-[10px] text-[#8E8E93]">{t.date}{acc ? ` · ${acc.name}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold" style={{ color }}>{t.amount.toLocaleString()}원</span>
                  {onDelete && (
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                      className="text-[10px] text-[#C7C7CC] opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  transactions: Transaction[]; // 이미 원하는 범위(계좌/전체)와 타입으로 필터링된 연간 내역 (비용 제외 구분도 포함해서 넘긴다)
  year: number;
  title: string;
  accounts?: Account[]; // 있으면 상세 내역에 계좌명을 함께 표시
  nonExpenseCategories?: string[]; // 이 구분들은 목록엔 표시하되 합계·비율 계산에서는 뺀다
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  // 아래 두 개가 함께 전달되면, 이 컴포넌트는 자체 월 상태 없이 부모가 넘긴 month를 그대로 쓰고
  // 화살표/스와이프는 부모의 네비게이션 함수를 호출한다 (페이지 안의 다른 "이번달" 표시와 동기화하기 위함).
  month?: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

export default function MonthlyStatsCarousel({
  transactions, year, title, accounts, nonExpenseCategories = [], onEdit, onDelete,
  month: controlledMonth, onPrevMonth, onNextMonth,
}: Props) {
  const isControlled = controlledMonth !== undefined;
  const [internalMonth, setInternalMonth] = useState(() => {
    const bm = getBillingMonth(new Date());
    return bm.year === year ? bm.month : 12;
  });
  const month = isControlled ? controlledMonth! : internalMonth;
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const prevMonth = () => {
    setExpandedCat(null);
    if (isControlled) onPrevMonth?.();
    else setInternalMonth(m => Math.max(1, m - 1));
  };
  const nextMonth = () => {
    setExpandedCat(null);
    if (isControlled) onNextMonth?.();
    else setInternalMonth(m => Math.min(12, m + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) prevMonth();
    else if (delta < -50) nextMonth();
    touchStartX.current = null;
  };

  const { start: rangeStart, end: rangeEnd } = getBillingRange(year, month);
  const mTxs = transactions.filter(t => isInBillingMonth(t.date, year, month) && t.category);
  const byCat = mTxs.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const allSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  // "비용 제외" 구분은 목록엔 보여주되 합계·비율 계산에는 넣지 않는다
  const sorted = allSorted.filter(([cat]) => !nonExpenseCategories.includes(cat));
  const excludedSorted = allSorted.filter(([cat]) => nonExpenseCategories.includes(cat));
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
      <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-3">{title}</div>

      {/* 월 네비게이션 (좌우 화살표 + 스와이프) */}
      <div
        className="flex items-center justify-center gap-3 mb-4 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={prevMonth}
          disabled={!isControlled && month === 1}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl hover:bg-[#F2F2F7] transition-all text-[#8E8E93] disabled:opacity-20"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center min-w-[80px]">
          <div className="text-[15px] font-semibold text-[#1C1C1E]">{month}월</div>
          <div className="text-[9px] text-[#C7C7CC] mt-0.5">{rangeStart.slice(5)} ~ {rangeEnd.slice(5)}</div>
        </div>
        <button
          onClick={nextMonth}
          disabled={!isControlled && month === 12}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl hover:bg-[#F2F2F7] transition-all text-[#8E8E93] disabled:opacity-20"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {allSorted.length === 0 ? (
        <div className="text-[12px] text-[#C7C7CC] text-center py-8">데이터 없음</div>
      ) : (
        <div className="space-y-3">
          {sorted.map(([cat, amount], i) => {
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
            const color = DOT_COLORS[i % DOT_COLORS.length];
            return (
              <CategoryRow
                key={cat}
                cat={cat} amount={amount} color={color} pct={pct}
                isOpen={expandedCat === cat}
                onToggle={() => setExpandedCat(expandedCat === cat ? null : cat)}
                items={mTxs.filter(t => t.category === cat).sort((a, b) => b.date.localeCompare(a.date))}
                accounts={accounts} onEdit={onEdit} onDelete={onDelete}
              />
            );
          })}
          {sorted.length > 0 && (
            <div className="border-t border-[#F2F2F7] pt-3 flex justify-between items-center">
              <span className="text-[12px] font-semibold text-[#1C1C1E]">{month}월 합계</span>
              <span className="text-[13px] font-semibold text-[#1C1C1E]">{total.toLocaleString()}원</span>
            </div>
          )}

          {excludedSorted.length > 0 && (
            <div className={sorted.length > 0 ? 'pt-1' : ''}>
              <div className="text-[10px] text-[#8E8E93] mb-2">비용 제외 (참고용 — 합계에는 포함되지 않음)</div>
              <div className="space-y-3">
                {excludedSorted.map(([cat, amount]) => (
                  <CategoryRow
                    key={cat}
                    cat={cat} amount={amount} color="#C7C7CC" muted
                    isOpen={expandedCat === cat}
                    onToggle={() => setExpandedCat(expandedCat === cat ? null : cat)}
                    items={mTxs.filter(t => t.category === cat).sort((a, b) => b.date.localeCompare(a.date))}
                    accounts={accounts} onEdit={onEdit} onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
