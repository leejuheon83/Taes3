'use client';

import { useState, useCallback, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  signOut,
  type User,
} from 'firebase/auth';

/**
 * 관리자 인증은 Firebase Auth(이메일/비밀번호)로 처리한다.
 * 화면은 전과 같이 비밀번호만 묻지만, 비밀번호는 더 이상 코드에 들어있지 않고
 * Firebase가 검증한다. 그래야 Firestore 규칙에서 request.auth로 관리자를 구분할 수 있다.
 *
 * 로그인 계정은 하나이며 이메일은 비밀 정보가 아니라 공개 환경변수로 둔다.
 * 탭을 닫으면 로그아웃되도록 세션 지속성을 쓴다 (기존 sessionStorage 동작과 동일).
 */
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'admin@taes-fc.com';

export function isAdmin(): boolean {
  return auth.currentUser !== null;
}

export async function adminSignOut(): Promise<void> {
  await signOut(auth);
}

function messageFor(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
      return '비밀번호가 틀렸습니다.';
    case 'auth/too-many-requests':
      return '시도가 너무 많습니다. 잠시 후 다시 해주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해 주세요.';
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔에서 이메일/비밀번호 로그인을 켜주세요.';
    case 'auth/user-disabled':
      return '비활성화된 계정입니다.';
    default:
      return '로그인에 실패했습니다.';
  }
}

export function useAdminAuth() {
  const [showModal, setShowModal] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [reconfirm, setReconfirm] = useState(false);
  const [, setUser] = useState<User | null>(auth.currentUser);

  // 새로고침 후 로그인 상태가 복원되면 다시 그린다
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  /**
   * 관리자 확인 뒤 action을 실행한다.
   * reconfirm: true — 이미 로그인했더라도 매번 다시 비밀번호를 묻는다 (수정·삭제용)
   */
  const requireAdmin = useCallback((action: () => void, opts?: { reconfirm?: boolean }) => {
    if (auth.currentUser && !opts?.reconfirm) { action(); return; }
    setPendingAction(() => action);
    setReconfirm(!!opts?.reconfirm);
    setInput('');
    setError('');
    setShowModal(true);
  }, []);

  const close = useCallback(() => {
    setShowModal(false);
    setPendingAction(null);
    setBusy(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (busy || !input) return;
    setBusy(true);
    setError('');
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, input);
      setShowModal(false);
      pendingAction?.();
      setPendingAction(null);
    } catch (err) {
      setError(messageFor((err as { code?: string }).code ?? ''));
      setInput('');
    } finally {
      setBusy(false);
    }
  }, [busy, input, pendingAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') close();
  }, [handleSubmit, close]);

  const modal = showModal ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔐</span>
          <h2 className="text-white font-black text-lg">관리자 인증</h2>
        </div>
        <p className="text-white/40 text-sm mb-4">{reconfirm ? '수정·삭제는 매번 비밀번호를 다시 확인합니다.' : '이 작업을 수행하려면 관리자 비밀번호가 필요합니다.'}</p>
        <input
          autoFocus
          type="password"
          value={input}
          disabled={busy}
          onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="비밀번호 입력"
          className="w-full px-3 py-2.5 text-white text-sm border outline-none mb-2 disabled:opacity-50"
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: error ? '#dc2626' : 'rgba(255,255,255,0.1)',
          }}
        />
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={close} disabled={busy}
            className="flex-1 py-2.5 text-sm font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors disabled:opacity-40">
            취소
          </button>
          <button onClick={handleSubmit} disabled={busy}
            className="flex-1 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#CC0000' }}>
            {busy ? '확인 중…' : '확인'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { requireAdmin, modal };
}
