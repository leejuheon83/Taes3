'use client';

import { useState, useCallback } from 'react';

const ADMIN_PASSWORD = '3333';
const SESSION_KEY = 'taes-admin-auth';

export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function useAdminAuth() {
  const [showModal, setShowModal] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requireAdmin = useCallback((action: () => void) => {
    if (isAdmin()) { action(); return; }
    setPendingAction(() => action);
    setInput('');
    setError(false);
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setShowModal(false);
      pendingAction?.();
      setPendingAction(null);
    } else {
      setError(true);
      setInput('');
    }
  }, [input, pendingAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { setShowModal(false); setPendingAction(null); }
  }, [handleSubmit]);

  const modal = showModal ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setPendingAction(null); } }}>
      <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔐</span>
          <h2 className="text-white font-black text-lg">관리자 인증</h2>
        </div>
        <p className="text-white/40 text-sm mb-4">이 작업을 수행하려면 관리자 비밀번호가 필요합니다.</p>
        <input
          autoFocus
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={handleKeyDown}
          placeholder="비밀번호 입력"
          className="w-full px-3 py-2.5 text-white text-sm border outline-none mb-2"
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: error ? '#dc2626' : 'rgba(255,255,255,0.1)',
          }}
        />
        {error && <p className="text-red-500 text-xs mb-3">비밀번호가 틀렸습니다.</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={() => { setShowModal(false); setPendingAction(null); }}
            className="flex-1 py-2.5 text-sm font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors">
            취소
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#CC0000' }}>
            확인
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { requireAdmin, modal };
}
