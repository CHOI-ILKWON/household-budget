'use client';
import { useState } from 'react';
import { AppState, Transaction } from '@/lib/types';
import { getBillingDate, getBillingRange, isInBillingMonth, affectsBalance, isExcludedFromBalance } from '@/lib/store';
import AddTransactionModal from './AddTransactionModal';
import CategoryModal from './CategoryModal';
import GoalModal from './GoalModal';

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

// 지출 중 "비용 제외" 구분(예: 회사 청구 예정 출장비)은 지출 합계에서 빼고 계산
function sumExpense(txs: Transaction[], nonExpenseCategories: string[]) {
  return txs
    .filter(t => t.type === 'expense' && !nonExpenseCategories.includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
}

function fmt(n: number) { return Math.abs(n).toLocaleString('ko-KR'); }

export default function HomeTab({ state, onChange }: Props) {
  const [viewDate, setViewDate] = useState(() => getBillingDate());
  const [showAdd, setShowAdd] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const bYear = viewDate.getFullYear();
  const bMonth = viewDate.getMonth() + 1;
  const year = new Date().getFullYear();

  const mTxs = state.transactions.filter(t => isInBillingMonth(t.date, bYear, bMonth));
  const yTxs = state.transactions.filter(t => t.date.startsWith(String(year)));

  const mInc = sumType(mTxs, 'income');
  const mExp = sumExpense(mTxs, state.nonExpenseCategories);
  const mRem = mInc - mExp;
  const yInc = sumType(yTxs, 'income');
  const yExp = sumExpense(yTxs, state.nonExpenseCategories);
  const yRem = yInc - yExp;
  const mSave = Math.max(0, mRem);
  const ySave = Math.max(0, yRem);

  // 일권용돈 일일 예산 계산
  const dailyAccount = state.accounts.find(a => a.name.includes('일권용돈'));
  const todayD = new Date();
  const todayStr = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,'0')}-${String(todayD.getDate()).padStart(2,'0')}`;
  const { end: curRangeEnd } = (() => { const bd = getBillingDate(); return getBillingRange(bd.getFullYear(), bd.getMonth()+1); })();
  const msPerDay = 1000*60*60*24;
  const remainDays = todayStr <= curRangeEnd
    ? Math.round((new Date(curRangeEnd).getTime() - new Date(todayStr).getTime()) / msPerDay) + 1
    : 0;
  const dailyBudget = dailyAccount && remainDays > 0 ? Math.floor(dailyAccount.balance / remainDays) : 0;
  const totalBal = state.accounts.reduce((s, a) => s + a.balance, 0);

  const totalUsed = mExp + mSave;
  const expPct = totalUsed > 0 ? Math.min(100, Math.round((mExp / totalUsed) * 100)) : 0;
  const savPct = totalUsed > 0 ? Math.min(100 - expPct, Math.round((mSave / totalUsed) * 100)) : 0;

  // 전체 내역엔 고정비(isFixed)와 비용 제외 구분 거래는 빼고, 나머지(변동비 위주)만 보여준다
  const mTxsExclFixed = mTxs.filter(t => !t.isFixed && !(t.type === 'expense' && state.nonExpenseCategories.includes(t.category)));
  const usedCats = Array.from(new Set(
    mTxsExclFixed.filter(t => t.type !== 'transfer' && t.category).map(t => t.category)
  ));
  const filtered = catFilter ? mTxsExclFixed.filter(t => t.category === catFilter) : mTxsExclFixed;
  const displayTxs = filtered.filter(t => t.type !== 'transfer' || t.toAccountId !== undefined);
  const sorted = [...displayTxs].sort((a, b) => b.date.localeCompare(a.date));
  const filteredExpTotal = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // 보험료·대출원리금처럼 정기적으로 나가는 고정비 (구분과 무관하게 거래별로 체크된 것)
  const fixedTxs = [...mTxs.filter(t => t.isFixed)].sort((a, b) => b.date.localeCompare(a.date));
  // 예전 "고정추가 (표시만)" 방식으로 등록된 항목들 — 실제 거래가 아니라 잔액엔 영향 없음
  const fixedTotal = fixedTxs.reduce((s, t) => s + t.amount, 0) + state.fixedExpenses.reduce((s, f) => s + f.amount, 0);

  const prevMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); };
  const nextMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); };
  const { start: rangeStart, end: rangeEnd } = getBillingRange(bYear, bMonth);

  const addTx = (tx: Omit<Transaction, 'id'>) => {
    const id = `tx_${Date.now()}_${Math.random()}`;
    const excludedFromBalance = isExcludedFromBalance(tx, state.nonExpenseCategories);
    const fullTx: Transaction = { ...tx, id, excludedFromBalance };
    const newAccounts = state.accounts.map(a => {
      if (tx.type === 'expense' && affectsBalance(fullTx) && a.id === tx.accountId) return { ...a, balance: a.balance - tx.amount };
      if (tx.type === 'income' && a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount };
      if (tx.type === 'transfer') {
        if (a.id === tx.accountId) return { ...a, balance: a.balance - tx.amount };
        if (a.id === tx.toAccountId) return { ...a, balance: a.balance + tx.amount };
      }
      return a;
    });
    onChange({ ...state, transactions: [...state.transactions, fullTx], accounts: newAccounts });
  };

  const handleEditTx = (updated: Transaction) => {
    const old = state.transactions.find(t => t.id === updated.id);
    if (!old) return;
    let newAccounts = state.accounts.map(a => {
      if (old.type === 'expense' && affectsBalance(old) && a.id === old.accountId) return { ...a, balance: a.balance + old.amount };
      if (old.type === 'income' && a.id === old.accountId) return { ...a, balance: a.balance - old.amount };
      if (old.type === 'transfer') {
        if (a.id === old.accountId) return { ...a, balance: a.balance + old.amount };
        if (a.id === old.toAccountId) return { ...a, balance: a.balance - old.amount };
      }
      return a;
    });
    const updatedFull: Transaction = { ...updated, excludedFromBalance: isExcludedFromBalance(updated, state.nonExpenseCategories) };
    newAccounts = newAccounts.map(a => {
      if (updatedFull.type === 'expense' && affectsBalance(updatedFull) && a.id === updatedFull.accountId) return { ...a, balance: a.balance - updatedFull.amount };
      if (updatedFull.type === 'income' && a.id === updatedFull.accountId) return { ...a, balance: a.balance + updatedFull.amount };
      if (updatedFull.type === 'transfer') {
        if (a.id === updatedFull.accountId) return { ...a, balance: a.balance - updatedFull.amount };
        if (a.id === updatedFull.toAccountId) return { ...a, balance: a.balance + updatedFull.amount };
      }
      return a;
    });
    onChange({
      ...state,
      accounts: newAccounts,
      transactions: state.transactions.map(t => t.id === updatedFull.id ? updatedFull : t),
    });
    setEditTx(null);
  };

  const deleteTx = (txId: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;
    const newAccounts = state.accounts.map(a => {
      if (tx.type === 'expense' && affectsBalance(tx) && a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount };
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

  const deleteFixedExpense = (id: string) => {
    onChange({ ...state, fixedExpenses: state.fixedExpenses.filter(f => f.id !== id) });
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
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
          <div className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2">일일 용돈</div>
          {dailyAccount ? (
            <>
              <div className={`text-[18px] font-bold tracking-tight mb-0.5 ${dailyBudget < 0 ? 'text-[#FF3B30]' : 'text-[#007AFF]'}`}>
                {dailyBudget < 0 ? '-' : ''}{Math.abs(dailyBudget).toLocaleString()}원
              </div>
              <div className="text-[10px] text-[#8E8E93]">잔액 {dailyAccount.balance.toLocaleString()}원</div>
              <div className="text-[10px] text-[#8E8E93] mt-1">잔여 {remainDays}일 · {curRangeEnd.slice(5)}까지</div>
            </>
          ) : (
            <div className="text-[11px] text-[#C7C7CC] mt-2">&#34;일권용돈&#34; 계좌를<br/>추가해주세요</div>
          )}
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

      {/* 하단 2컬럼: 고정비 + 전체 내역 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 고정비 */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2">
            <span className="text-[12px] font-semibold text-[#1C1C1E]">고정비</span>
          </div>
          <div className="px-3 flex-1">
            {fixedTxs.length === 0 && state.fixedExpenses.length === 0 ? (
              <div className="text-[10px] text-[#C7C7CC] text-center py-8">등록된 고정비 없음</div>
            ) : (
              <>
                {fixedTxs.map(t => {
                  const acc = state.accounts.find(a => a.id === t.accountId);
                  return (
                    <div
                      key={t.id}
                      className="flex justify-between items-center py-1.5 border-b border-[#F2F2F7] last:border-0 cursor-pointer active:bg-[#F2F2F7] rounded-lg"
                      onClick={() => setEditTx(t)}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#1C1C1E] truncate">{t.note || t.category}</div>
                        <div className="text-[10px] text-[#8E8E93] truncate">{acc?.name}</div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#FF9500] shrink-0 ml-1">{t.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
                {state.fixedExpenses.map(f => {
                  const acc = state.accounts.find(a => a.id === f.accountId);
                  return (
                    <div key={f.id} className="flex justify-between items-center py-1.5 border-b border-[#F2F2F7] last:border-0 group">
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#1C1C1E] truncate">{f.name}</div>
                        <div className="text-[10px] text-[#C7C7CC] truncate">{acc?.name} · 표시만 (잔액 미반영)</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className="text-[11px] font-semibold text-[#FF9500]">{f.amount.toLocaleString()}</span>
                        <button
                          onClick={() => deleteFixedExpense(f.id)}
                          className="text-[11px] text-[#C7C7CC] px-1"
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <div className="flex justify-between items-center px-3 py-2.5 bg-[#FFF6EC] mt-auto">
            <span className="text-[11px] font-semibold text-[#FF9500]">고정비 합계</span>
            <span className="text-[11px] font-semibold text-[#FF9500]">{fixedTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* 전체 내역 */}
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
                <div
                  key={t.id}
                  className="flex items-start justify-between py-1.5 border-b border-[#F2F2F7] last:border-0 group cursor-pointer active:bg-[#F2F2F7] rounded-lg"
                  onClick={() => setEditTx(t)}
                >
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
                    <button
                      onClick={e => { e.stopPropagation(); deleteTx(t.id); }}
                      className="text-[11px] text-[#C7C7CC] px-1"
                    >✕</button>
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
          accounts={state.accounts}
          categories={state.categories}
          onAdd={tx => { addTx(tx); setShowAdd(false); }}
          onAddFixed={item => {
            onChange({
              ...state,
              fixedExpenses: [...state.fixedExpenses, { ...item, id: `fe_${Date.now()}` }],
            });
            setShowAdd(false);
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
      {showCat && (
        <CategoryModal
          categories={state.categories}
          nonExpenseCategories={state.nonExpenseCategories}
          onUpdate={cats => onChange({ ...state, categories: cats })}
          onRename={(old, newName) => {
            onChange({
              ...state,
              categories: state.categories.map(c => c === old ? newName : c),
              nonExpenseCategories: state.nonExpenseCategories.map(c => c === old ? newName : c),
              transactions: state.transactions.map(t => t.category === old ? { ...t, category: newName } : t),
            });
          }}
          onToggleNonExpense={name => {
            const has = state.nonExpenseCategories.includes(name);
            const willExclude = !has;
            const nonExpenseCategories = has
              ? state.nonExpenseCategories.filter(c => c !== name)
              : [...state.nonExpenseCategories, name];

            // 이 구분에 이미 등록된 지출들의 excludedFromBalance를 새 설정에 맞춰 다시 계산하고,
            // 그 차이만큼 계좌 잔액에도 소급 반영한다 (제외로 켜면 그동안 차감된 만큼 돌려주고,
            // 끄면 반대로 다시 차감한다).
            const balanceDeltas = new Map<number, number>();
            const transactions = state.transactions.map(t => {
              if (t.type !== 'expense' || t.category !== name) return t;
              const wasExcluded = !!t.excludedFromBalance;
              if (wasExcluded === willExclude) return t;
              const delta = willExclude ? t.amount : -t.amount;
              balanceDeltas.set(t.accountId, (balanceDeltas.get(t.accountId) ?? 0) + delta);
              return { ...t, excludedFromBalance: willExclude };
            });
            const accounts = state.accounts.map(a =>
              balanceDeltas.has(a.id) ? { ...a, balance: a.balance + (balanceDeltas.get(a.id) ?? 0) } : a
            );

            onChange({ ...state, nonExpenseCategories, transactions, accounts });
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
    </div>
  );
}
