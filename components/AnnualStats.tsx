'use client';
import { useState, useEffect, useRef } from 'react';
import { AppState } from '@/lib/types';

interface Props { state: AppState }

const DOT_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55',
];

export default function AnnualStats({ state }: Props) {
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<unknown>(null);
  const year = new Date().getFullYear();

  const yearTxs = state.transactions.filter(t => t.date.startsWith(String(year)));

  const byCategory = yearTxs
    .filter(t => t.type === tab && t.category)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, '0')}`;
    return yearTxs.filter(t => t.date.startsWith(mk) && t.type === tab).reduce((s, t) => s + t.amount, 0);
  });

  useEffect(() => {
    if (!chartRef.current) return;
    const loadChart = async () => {
      const mod = await import('chart.js/auto');
      const Chart = mod.default;
      if (chartInstance.current) {
        (chartInstance.current as { destroy(): void }).destroy();
      }
      const barColor = tab === 'expense' ? '#FF3B30' : '#34C759';
      chartInstance.current = new Chart(chartRef.current!, {
        type: 'bar',
        data: {
          labels: Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
          datasets: [{
            label: tab === 'expense' ? '지출' : '수입',
            data: monthlyData,
            backgroundColor: barColor + '33',
            borderColor: barColor,
            borderWidth: 1.5,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              ticks: {
                font: { size: 10 },
                color: '#8E8E93',
                callback: (v: unknown) => `${(Number(v) / 10000).toFixed(0)}만`,
              },
              grid: { color: '#F2F2F7' },
              border: { display: false },
            },
            x: {
              ticks: { font: { size: 10 }, color: '#8E8E93' },
              grid: { display: false },
              border: { display: false },
            },
          },
        },
      });
    };
    loadChart();
    return () => {
      if (chartInstance.current) {
        (chartInstance.current as { destroy(): void }).destroy();
        chartInstance.current = null;
      }
    };
  }, [tab, state.transactions]);

  return (
    <div className="space-y-4">
      {/* 세그먼트 컨트롤 */}
      <div className="flex bg-[#E5E5EA] rounded-xl p-0.5">
        {(['expense', 'income'] as const).map(v => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex-1 py-2 text-[14px] font-medium rounded-[10px] transition-all duration-200 ${
              tab === v ? `bg-white shadow-sm ${v === 'expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'}` : 'text-[#8E8E93]'
            }`}
          >
            {v === 'expense' ? '지출 통계' : '수입 통계'}
          </button>
        ))}
      </div>

      {/* 구분별 */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
        <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-4">
          {year}년 {tab === 'expense' ? '지출' : '수입'} — 구분별
        </div>
        {sorted.length === 0 ? (
          <div className="text-[12px] text-[#C7C7CC] text-center py-8">데이터 없음</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(([cat, amount], i) => {
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              const color = DOT_COLORS[i % DOT_COLORS.length];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[13px] text-[#1C1C1E]">{cat}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-[#1C1C1E]">{amount.toLocaleString()}원</span>
                      <span className="text-[11px] text-[#8E8E93] w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#F2F2F7] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            <div className="border-t border-[#F2F2F7] pt-3 flex justify-between items-center">
              <span className="text-[12px] font-semibold text-[#1C1C1E]">합계</span>
              <span className="text-[13px] font-semibold text-[#1C1C1E]">{total.toLocaleString()}원</span>
            </div>
          </div>
        )}
      </div>

      {/* 월별 차트 */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
        <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-4">
          월별 {tab === 'expense' ? '지출' : '수입'}
        </div>
        <div style={{ height: 160 }}>
          <canvas ref={chartRef} />
        </div>
      </div>
    </div>
  );
}
