'use client';
import { Transaction } from '@/lib/types';

const DOT_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55',
];

interface Props {
  transactions: Transaction[]; // 이미 원하는 범위(계좌/전체)와 타입으로 필터링된 내역
  year: number;
  title: string;
}

export default function MonthlyCategoryBreakdown({ transactions, year, title }: Props) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(m => {
      const mk = `${year}-${String(m).padStart(2, '0')}`;
      const mTxs = transactions.filter(t => t.date.startsWith(mk) && t.category);
      const byCat = mTxs.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      return { m, sorted, total };
    })
    .filter(x => x.total > 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
      <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-4">{title}</div>
      {months.length === 0 ? (
        <div className="text-[12px] text-[#C7C7CC] text-center py-8">데이터 없음</div>
      ) : (
        <div className="space-y-4">
          {months.map(({ m, sorted, total }) => (
            <div key={m}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[12px] font-semibold text-[#1C1C1E]">{m}월</span>
                <span className="text-[12px] font-semibold text-[#1C1C1E]">{total.toLocaleString()}원</span>
              </div>
              <div className="space-y-1 pl-1">
                {sorted.map(([cat, amt], i) => {
                  const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
                  const color = DOT_COLORS[i % DOT_COLORS.length];
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[11px] text-[#8E8E93] truncate">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#1C1C1E]">{amt.toLocaleString()}원</span>
                        <span className="text-[10px] text-[#C7C7CC] w-7 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
