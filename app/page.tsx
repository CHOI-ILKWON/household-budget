'use client';
import { useState, useEffect } from 'react';
import { AppState } from '@/lib/types';
import { loadState, saveState } from '@/lib/store';
import HomeTab from '@/components/HomeTab';
import AccountTab from '@/components/AccountTab';
import AnnualStats from '@/components/AnnualStats';
import AddAccountModal from '@/components/AddAccountModal';

type TabId = 'home' | number | 'stats' | 'add';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showAddAccount, setShowAddAccount] = useState(false);

  useEffect(() => { setState(loadState()); }, []);

  const handleChange = (newState: AppState) => {
    setState(newState);
    saveState(newState);
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7]">
        <div className="text-[#8E8E93] text-sm">불러오는 중...</div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'home', label: '홈' },
    ...state.accounts.map(a => ({ id: a.id as TabId, label: `${a.id}.${a.name}` })),
    { id: 'stats', label: '통계' },
    { id: 'add', label: '+' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-md mx-auto">
        {/* 탭바 */}
        <div className="bg-white/80 backdrop-blur-md border-b border-[#E5E5EA] sticky top-0 z-40">
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex min-w-max">
              {tabs.map(t => (
                <button
                  key={String(t.id)}
                  onClick={() => {
                    if (t.id === 'add') setShowAddAccount(true);
                    else setActiveTab(t.id);
                  }}
                  className={`px-3 py-2.5 text-[12px] whitespace-nowrap transition-all duration-200 min-h-[44px] border-b-2 ${
                    activeTab === t.id && t.id !== 'add'
                      ? 'font-semibold text-[#1C1C1E] border-[#007AFF]'
                      : t.id === 'add'
                      ? 'text-[#007AFF] font-medium border-transparent'
                      : 'font-normal text-[#8E8E93] border-transparent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="px-4 pt-4 pb-10">
          {activeTab === 'home' && <HomeTab state={state} onChange={handleChange} />}
          {typeof activeTab === 'number' && (
            <AccountTab accountId={activeTab} state={state} onChange={handleChange} />
          )}
          {activeTab === 'stats' && <AnnualStats state={state} />}
        </div>
      </div>

      {showAddAccount && (
        <AddAccountModal
          nextId={state.accounts.length > 0 ? Math.max(...state.accounts.map(a => a.id)) + 1 : 1}
          onAdd={account => {
            handleChange({ ...state, accounts: [...state.accounts, account] });
            setShowAddAccount(false);
          }}
          onClose={() => setShowAddAccount(false)}
        />
      )}
    </div>
  );
}
