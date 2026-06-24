'use client';
import { useState } from 'react';
import { AppState, Transaction } from '@/lib/types';
import { getBillingDate, getBillingRange, isInBillingMonth } from '@/lib/store';
import AddTransactionModal from './AddTransactionModal';
import CategoryModal from './CategoryModal';
import GoalModal from './GoalModal';
import FixedExpenseSheet from './FixedExpenseSheet';

interface Props {
  state: AppState;
  onChange: (s: AppState) => void;
}

const SL = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2">{children}</div>
);

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-[#E5E5EA] rounded-full h-1 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function sumType(txs: Transaction[], type: Transaction['type']) {
  return txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
}

function fmt(n: number) { return Math.abs(n).toLocaleString('ko-KR'); }

export default function HomeTab({ state, onChange }: Props) {
  // viewDate는 항상 청구 월의 1일로 정규화 (25일 기산)
  const [viewDate, setViewDate] = useState(() => getBillingDate());
  const [showAdd, setShowAdd] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showFixed, setShowFixed] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const bYear = viewDate.getFullYear();
  const bMonth = viewDate.getMonth() + 1;
  const year = new Date().getFullYear(); // 올해 요약은 달력 연도 기준

  const mTxs = state.transactions.filter(t => isInBillingMonth(t.date, bYear, bMonth));
  const yTxs = state.transactions.filter(t => t.date.startsWith(String(year)));

  const mInc = sumType(mTxs, 'income');
  const mExp = sumType(mTxs, 'expense');
  const mRem = mInc - mExp;
  const yInc = sumType(yTxs, 'income');
  const yExp = sumType(yTxs, 'expense');
  const yRem = yInc - yExp;
  const mSave = Math.max(0, mRem);
  const ySave = Math.max(0, yRem);
  const fixedTotal = state.fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const totalBal = state.accounts.reduce((s, a) => s + a.balance, 0);

  // 비율 바 (지출 red + 저축 blue)
  const totalUsed = mExp + mSave;
  const expPct = totalUsed > 0 ? Math.min(100, Math.round((mExp / totalUsed) * 100)) : 0;
  const savPct = totalUsed > 0 ? Math.min(100 - expPct, Math.round((mSave / totalUsed) * 100)) : 0;

  // 이체는 제외하고 지출/수입만 구분 칩에 표시
  const usedCats = Array.from(new Set(
    mTxs.filter(t => t.type !== 'transfer' && t.category).map(t => t.category)
  ));
  const filtered = catFilter ? mTxs.filter(t => t.category === catFilter) : mTxs;
  // 이체는 홈탭 목록에서도 이체입금(수신)만 표시
  const displayTxs = filtered.filter(t => t.type !== 'transfer' || t.toAccountId !== undefined);
  const sorted = [...displayTxs].sort((a, b) => b.date.localeCompare(a.date));
  const filteredExpTotal = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const prevMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); };
  const nextMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); };
  const { start: rangeStart, end: rangeEnd } = getBillingRange(bYear, bMonth);

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

  const txColor = (type: Transaction['type']) =>
    type === 'income' ? 'text-[#34C759]' : type === 'expense' ? 'text-[#FF3B30]' : 'text-[#007AFF]';
  const txDotBg = (type: Transaction['type']) =>
    type === 'income' ? 'bg-[#34C759]' : type === 'expense' ? 'bg-[#FF3B30]' : 'bg-[#007AFF]';
  const txSign = (type: Transaction['type']) =>
    type === 'income' ? '+' : type === 'expense' ? '-' : '+';

  return (
    <div className="space-y-3">
      {/* 연간 요약 */}
      <div>
        <SL>올해 요약</SL>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '수입', v: yInc, c: 'text-[#34C759]' },
            { label: '지출', v: yExp, c: 'text-[#FF3B30]' },
            { label: '잔여', v: yRem, c: yRem >= 0 ? 'text-[#1C1C1E]' : 'text-[#FF3B30]' },
          ].map(x => (
            <div key={x.label} className="bg-[#F2F2F7] rounded-2xl p-3 text-center">
              <div className="text-[10px] text-[#8E8E93] mb-1">{x.label}</div>
              <div className={`text-[15px] font-semibold tracking-tight ${x.c}`}>
                {x.v < 0 ? '-' : ''}{fmt(x.v)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#E5E5EA]" />

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
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '수입', v: mInc, c: 'text-[#34C759]' },
          { label: '지출', v: mExp, c: 'text-[#FF3B30]' },
          { label: '잔여', v: mRem, c: mRem >= 0 ? 'text-[#1C1C1E]' : 'text-[#FF3B30]' },
        ].map(x => (
          <div key={x.label} className="bg-[#F2F2F7] rounded-2xl p-3 text-center">
            <div className="text-[10px] text-[#8E8E93] mb-1">{x.label}</div>
            <div className={`text-[15px] font-semibold tracking-tight ${x.c}`}>
              {x.v < 0 ? '-' : ''}{fmt(x.v)}
            </div>
          </div>
        ))}
      </div>

      {/* 비율 바 */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
        <SL>수입 대비 비율</SL>
        <div className="w-full bg-[#E5E5EA] rounded-full h-1.5 overflow-hidden flex">
          <div className="h-full bg-[#FF3B30] transition-all duration-300 rounded-l-full" style={{ width: `${expPct}%` }} />
          <div className="h-full bg-[#007AFF] transition-all duration-300" style={{ width: `${savPct}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] shrink-0" />
            <span className="text-[10px] text-[#8E8E93]">지출 {expPct}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#007AFF] shrink-0" />
            <span className="text-[10px] text-[#8E8E93]">저축 {savPct}%</span>
          </div>
        </div>
      </div>

      {/* 목표 카드 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 cursor-pointer active:opacity-70 transition-opacity" onClick={() => setShowGoal(true)}>
          <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2">월간 목표</div>
          <div className="text-[13px] font-semibold text-[#1C1C1E] mb-0.5">
            {fmt(mSave)}<span className="text-[10px] text-[#8E8E93] font-normal"> / {fmt(state.monthlyGoal)}</span>
          </div>
          <Bar value={mSave} max={state.monthlyGoal} color="bg-[#34C759]" />
          <div className="text-[10px] text-[#8E8E93] mt-1 text-right">
            {state.monthlyGoal > 0 ? Math.min(100, Math.round((mSave / state.monthlyGoal) * 100)) : 0}%
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 cursor-pointer active:opacity-70 transition-opacity" onClick={() => setShowGoal(true)}>
          <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2">연간 목표</div>
          <div className="text-[13px] font-semibold text-[#1C1C1E] mb-0.5">
            {fmt(ySave)}<span className="text-[10px] text-[#8E8E93] font-normal"> / {fmt(state.annualGoal)}</span>
          </div>
          <Bar value={ySave} max={state.annualGoal} color="bg-[#007AFF]" />
          <div className="text-[10px] text-[#8E8E93] mt-1 text-right">
            {state.annualGoal > 0 ? Math.min(100, Math.round((ySave / state.annualGoal) * 100)) : 0}%
          </div>
        </div>
      </div>

      {/* 계좌 현황 */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
        <div className="flex justify-between items-baseline mb-3">
          <SL>계좌 현황</SL>
          <span className="text-[11px] text-[#8E8E93] -mt-2">총 {totalBal.toLocaleString()}원</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {state.accounts.map(a => (
            <div key={a.id} className="bg-[#F2F2F7] rounded-xl p-1.5 text-center">
              <div className="text-[9px] text-[#C7C7CC] leading-tight">{a.id}</div>
              <div className="text-[10px] font-medium text-[#1C1C1E] truncate leading-tight">{a.name}</div>
              <div className={`text-[11px] font-semibold leading-tight ${a.balance < 0 ? 'text-[#FF3B30]' : 'text-[#1C1C1E]'}`}>
                {a.balance < 0 ? '-' : ''}{Math.abs(a.balance).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 2컬럼 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 고정지출 */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden flex flex-col">
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <SL>고정지출</SL>
            <button
              onClick={() => setShowFixed(true)}
              className="text-[11px] text-[#007AFF] -mt-2 font-medium"
            >편집</button>
          </div>
          {state.fixedExpenses.length === 0 ? (
            <div className="px-3 pb-3">
              <button
                onClick={() => setShowFixed(true)}
                className="w-full text-[11px] text-[#8E8E93] py-4 border border-dashed border-[#E5E5EA] rounded-xl"
              >+ 고정지출 추가</button>
            </div>
          ) : (
            <>
              <div className="flex-1">
                {state.fixedExpenses.map(f => {
                  const acc = state.accounts.find(a => a.id === f.accountId);
                  return (
                    <div key={f.id} className="flex justify-between items-center px-3 py-2 border-b border-[#F2F2F7] last:border-0">
                      <div className="min-w-0">
                        <div className="text-[12px] text-[#1C1C1E] truncate">{f.name}</div>
                        {acc && <div className="text-[10px] text-[#C7C7CC]">{acc.name}</div>}
                      </div>
                      <span className="text-[12px] text-[#FF3B30] shrink-0 ml-1">{f.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 bg-[#F2F2F7]">
                <span className="text-[11px] font-semibold text-[#1C1C1E]">합계</span>
                <span className="text-[11px] font-semibold text-[#FF3B30]">{fixedTotal.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* 이번달 내역 */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-3 pt-3 pb-2">
            <span className="text-[12px] font-semibold text-[#1C1C1E]">전체 내역</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowCat(true)} className="text-[11px] text-[#007AFF]">구분</button>
              <button onClick={() => setShowAdd(true)} className="text-[11px] bg-[#007AFF] text-white rounded-lg px-2 py-1 leading-none">+ 추가</button>
            </div>
          </div>

          {usedCats.length > 0 && (
            <div className="px-3 flex flex-wrap gap-1 mb-2">
              <button
                onClick={() => setCatFilter(null)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-200 ${catFilter === null ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-[#8E8E93]'}`}
              >전체</button>
              {usedCats.map(c => (
                <button key={c}
                  onClick={() => setCatFilter(catFilter === c ? null : c)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-200 ${catFilter === c ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-[#8E8E93]'}`}
                >{c}</button>
              ))}
            </div>
          )}

          <div className="overflow-y-auto max-h-64 px-3">
            {sorted.length === 0 ? (
              <div className="text-[10px] text-[#C7C7CC] text-center py-8">내역 없음</div>
            ) : sorted.map(t => {
              const acc = state.accounts.find(a => a.id === t.accountId);
              const fromAcc = t.type === 'transfer' ? state.accounts.find(a => a.id === t.accountId) : null;
              return (
                <div key={t.id} className="flex items-start justify-between py-1.5 border-b border-[#F2F2F7] last:border-0 group">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 opacity-20 ${txDotBg(t.type)}`} />
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#1C1C1E] truncate">{t.note || (t.type === 'transfer' ? '이체입금' : t.category)}</div>
                      <div className="text-[10px] text-[#8E8E93] truncate">
                        {t.type === 'transfer' ? `${fromAcc?.name} →` : acc?.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[11px] font-semibold ${txColor(t.type)}`}>
                      {txSign(t.type)}{t.amount.toLocaleString()}
                    </span>
                    <button onClick={() => deleteTx(t.id)} className="text-[9px] text-[#C7C7CC] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center px-3 py-2 bg-[#FFF1F0] mt-auto">
            <span className="text-[11px] text-[#FF3B30]">지출 합계</span>
            <span className="text-[11px] font-semibold text-[#FF3B30]">{filteredExpTotal.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddTransactionModal
          accounts={state.accounts} categories={state.categories}
          onAdd={addTx} onClose={() => setShowAdd(false)}
        />
      )}
      {showCat && (
        <CategoryModal
          categories={state.categories}
          onUpdate={cats => onChange({ ...state, categories: cats })}
          onRename={(old, newName) => {
            onChange({
              ...state,
              categories: state.categories.map(c => c === old ? newName : c),
              transactions: state.transactions.map(t => t.category === old ? { ...t, category: newName } : t),
            });
          }}
          onClose={() => setShowCat(false)}
        />
      )}
      {showGoal && (
        <GoalModal
          monthlyGoal={state.monthlyGoal} annualGoal={state.annualGoal}
          onSave={(m, a) => onChange({ ...state, monthlyGoal: m, annualGoal: a })}
          onClose={() => setShowGoal(false)}
        />
      )}
      {showFixed && (
        <FixedExpenseSheet
          fixedExpenses={state.fixedExpenses}
          accounts={state.accounts}
          onUpdate={expenses => onChange({ ...state, fixedExpenses: expenses })}
          onClose={() => setShowFixed(false)}
        />
      )}
    </div>
  );
}
