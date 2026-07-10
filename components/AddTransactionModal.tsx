'use client';
import { useState } from 'react';
import { Account, Transaction, TransactionType, FixedExpense } from '@/lib/types';

interface Props {
  accounts: Account[];
  categories: string[];
  defaultAccountId?: number;
  defaultType?: TransactionType;
  editTx?: Transaction;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  onAddFixed?: (item: Omit<FixedExpense, 'id'>) => void;
  onAddCategory: (name: string) => void;
  onClose: () => void;
}

const TABS: { label: string; value: TransactionType; color: string }[] = [
  { label: '지출', value: 'expense', color: 'text-[#FF3B30]' },
  { label: '수입', value: 'income', color: 'text-[#34C759]' },
  { label: '이체', value: 'transfer', color: 'text-[#007AFF]' },
];

export default function AddTransactionModal({ accounts, categories, defaultAccountId, defaultType, editTx, onAdd, onEdit, onDelete, onAddFixed, onAddCategory, onClose }: Props) {
  const isEdit = !!editTx;
  const [type, setType] = useState<TransactionType>(editTx?.type ?? defaultType ?? 'expense');
  const [accountId, setAccountId] = useState(editTx?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? 1);
  const [toAccountId, setToAccountId] = useState(
    editTx?.toAccountId ?? accounts.find(a => a.id !== (editTx?.accountId ?? defaultAccountId ?? accounts[0]?.id))?.id ?? accounts[1]?.id ?? 2
  );
  const [category, setCategory] = useState(editTx?.category || categories[0] || '기타');
  const [amount, setAmount] = useState(editTx ? editTx.amount.toLocaleString('ko-KR') : '');
  const [note, setNote] = useState(editTx?.note ?? '');
  const [date, setDate] = useState(() => {
    if (editTx?.date) return editTx.date;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isFixed, setIsFixed] = useState(editTx?.isFixed ?? false);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setCategory(trimmed);
    setNewCategoryName('');
    setAddingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount.replace(/,/g, ''), 10);
    if (!num || num <= 0) return;
    const txData = {
      date,
      type,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      category: type === 'transfer' ? '' : category,
      amount: num,
      note,
      isFixed: type !== 'income' ? isFixed : false,
    };
    if (isEdit && editTx && onEdit) {
      onEdit({ ...editTx, ...txData });
    } else {
      onAdd(txData);
    }
    onClose();
  };

  const handleAddFixed = () => {
    const num = parseInt(amount.replace(/,/g, ''), 10);
    if (!num || num <= 0) return;
    const name = note.trim() || category;
    if (!name) return;
    onAddFixed?.({ name, amount: num, accountId });
    onClose();
  };

  const fmtAmount = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    return n ? n.toLocaleString('ko-KR') : '';
  };

  const activeTab = TABS.find(t => t.value === type)!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-5" />

        <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-5">{isEdit ? '내역 수정' : '내역 추가'}</h2>

        <div className="flex bg-[#E5E5EA] rounded-xl p-0.5 mb-5">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex-1 py-2 text-[14px] font-medium rounded-[10px] transition-all duration-200 ${
                type === t.value ? `bg-white shadow-sm ${t.color}` : 'text-[#8E8E93]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">날짜</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">
              {type === 'transfer' ? '출금 계좌' : '계좌'}
            </label>
            <select
              value={accountId}
              onChange={e => setAccountId(Number(e.target.value))}
              className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] appearance-none"
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.id}. {a.name} ({a.bank})</option>)}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">입금 계좌</label>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(Number(e.target.value))}
                className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] appearance-none"
              >
                {accounts.filter(a => a.id !== accountId).map(a => (
                  <option key={a.id} value={a.id}>{a.id}. {a.name} ({a.bank})</option>
                ))}
              </select>
            </div>
          )}

          {type !== 'transfer' && (
            <div>
              <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">구분</label>
              <select
                value={category}
                onChange={e => {
                  if (e.target.value === '__new__') setAddingCategory(true);
                  else setCategory(e.target.value);
                }}
                className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E] appearance-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ 새 구분 추가</option>
              </select>
              {addingCategory && (
                <div className="flex gap-2 mt-2">
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    placeholder="새 구분 이름"
                    className="flex-1 bg-[#F2F2F7] rounded-xl px-4 py-2.5 text-[14px] border-none outline-none text-[#1C1C1E]"
                  />
                  <button type="button" onClick={handleAddCategory} className="bg-[#007AFF] text-white rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-all active:opacity-80">추가</button>
                  <button type="button" onClick={() => { setAddingCategory(false); setNewCategoryName(''); }} className="text-[13px] text-[#8E8E93] px-1">취소</button>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">금액</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(fmtAmount(e.target.value))}
              className={`bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full font-semibold ${activeTab.color}`}
            />
          </div>

          <div>
            <label className="text-[11px] text-[#8E8E93] uppercase tracking-wide font-medium block mb-1.5">내용</label>
            <input
              type="text"
              placeholder="내용 입력 (선택)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none w-full text-[#1C1C1E]"
            />
          </div>

          {type !== 'income' && (
            <button
              type="button"
              onClick={() => setIsFixed(v => !v)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-medium transition-all ${
                isFixed ? 'bg-[#FF9500] text-white' : 'bg-[#F2F2F7] text-[#8E8E93]'
              }`}
            >
              <span>고정비 (보험료·대출원리금처럼 정기적으로 나가는 돈)</span>
              <span className="text-[16px] leading-none">{isFixed ? '✓' : ''}</span>
            </button>
          )}

          <button
            type="submit"
            className="w-full bg-[#007AFF] text-white py-3.5 rounded-2xl text-[17px] font-semibold mt-2 transition-all duration-200 active:opacity-80"
          >
            {isEdit ? '수정 완료' : '추가'}
          </button>

          {!isEdit && type === 'expense' && onAddFixed && (
            <button
              type="button"
              onClick={handleAddFixed}
              className="w-full bg-[#F2F2F7] text-[#FF9500] py-3.5 rounded-2xl text-[17px] font-semibold transition-all duration-200 active:opacity-80"
            >
              고정추가 (표시만)
            </button>
          )}

          {isEdit && onDelete && editTx && (
            <button
              type="button"
              onClick={() => { onDelete(editTx.id); onClose(); }}
              className="w-full bg-[#FFF1F0] text-[#FF3B30] py-3.5 rounded-2xl text-[17px] font-semibold transition-all duration-200 active:opacity-80"
            >
              삭제
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
