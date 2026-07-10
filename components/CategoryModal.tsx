'use client';
import { useState } from 'react';

interface Props {
  categories: string[];
  nonExpenseCategories: string[];
  onUpdate: (categories: string[]) => void;
  onRename: (oldName: string, newName: string) => void;
  onToggleNonExpense: (name: string) => void;
  onClose: () => void;
}

export default function CategoryModal({ categories, nonExpenseCategories, onUpdate, onRename, onToggleNonExpense, onClose }: Props) {
  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    onUpdate([...categories, trimmed]);
    setNewCat('');
  };

  const handleRename = (old: string) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === old) { setEditing(null); return; }
    onRename(old, trimmed);
    setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-5" />
        <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-1">구분 관리</h2>
        <p className="text-[11px] text-[#8E8E93] mb-4">
          &#34;비용 제외&#34;로 설정한 구분은 계좌 잔액과 지출 합계·통계에 전혀 영향을 주지 않습니다 (예: 회사에 청구할 출장비)
        </p>

        <div className="max-h-64 overflow-y-auto mb-4">
          {categories.map(cat => {
            const isNonExpense = nonExpenseCategories.includes(cat);
            return (
              <div key={cat} className="flex items-center py-3 border-b border-[#F2F2F7] last:border-0">
                {editing === cat ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(cat)}
                      className="flex-1 bg-[#F2F2F7] rounded-xl px-3 py-2 text-[14px] border-none outline-none text-[#1C1C1E]"
                    />
                    <button onClick={() => handleRename(cat)} className="text-[13px] text-[#007AFF] ml-3 font-medium">저장</button>
                    <button onClick={() => setEditing(null)} className="text-[13px] text-[#8E8E93] ml-2">취소</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[14px] text-[#1C1C1E]">{cat}</span>
                    <button
                      onClick={() => onToggleNonExpense(cat)}
                      className={`text-[11px] px-2 py-1 rounded-full font-medium mr-2 transition-all ${
                        isNonExpense ? 'bg-[#FF9500] text-white' : 'bg-[#F2F2F7] text-[#8E8E93]'
                      }`}
                    >비용 제외</button>
                    <button
                      onClick={() => { setEditing(cat); setEditName(cat); }}
                      className="text-[12px] text-[#007AFF] font-medium"
                    >수정</button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="새 구분 입력"
            className="flex-1 bg-[#F2F2F7] rounded-xl px-4 py-3 text-[15px] border-none outline-none text-[#1C1C1E]"
          />
          <button
            onClick={handleAdd}
            className="bg-[#007AFF] text-white rounded-xl px-4 py-3 text-[15px] font-semibold transition-all active:opacity-80"
          >추가</button>
        </div>
      </div>
    </div>
  );
}
