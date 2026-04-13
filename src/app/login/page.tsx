'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const USER_AUTH_KEY = 'taes-user-login';
const VALID_ID = '3333';
const VALID_PW = '3333';

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(USER_AUTH_KEY) === '1') {
      router.replace('/');
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (id === VALID_ID && pw === VALID_PW) {
        localStorage.setItem(USER_AUTH_KEY, '1');
        router.replace('/');
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #050505 0%, #120000 50%, #050505 100%)',
      }}
    >
      {/* 배경 장식 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(204,0,0,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* 로고 */}
        <Link href="/" className="flex flex-col items-center gap-3 mb-10">
          <Image
            src="/taes-logo.png"
            alt="TAES FC"
            width={72}
            height={72}
            className="rounded-full"
            style={{ filter: 'drop-shadow(0 0 12px rgba(204,0,0,0.7))' }}
          />
          <div className="text-center">
            <div className="font-black text-white text-2xl tracking-wider leading-none">TAES FC</div>
            <div className="text-[#CC0000] text-xs font-bold tracking-widest mt-0.5">PREMIER</div>
          </div>
        </Link>

        {/* 카드 */}
        <div
          className="w-full rounded-sm border border-white/10 p-8"
          style={{ background: 'linear-gradient(160deg, #0d0d0d 0%, #111 100%)' }}
        >
          <h1 className="text-white font-black text-xl mb-1">로그인</h1>
          <p className="text-white/40 text-sm mb-7">TAES FC PREMIER 멤버 전용</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 아이디 */}
            <div>
              <label className="block text-xs font-bold text-white/50 mb-1.5 tracking-wider uppercase">
                아이디
              </label>
              <input
                type="text"
                value={id}
                onChange={e => { setId(e.target.value); setError(''); }}
                placeholder="아이디 입력"
                className="w-full px-4 py-3 rounded-sm text-sm text-white outline-none transition-all"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  caretColor: '#CC0000',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(204,0,0,0.6)'; e.target.style.boxShadow = '0 0 0 2px rgba(204,0,0,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                autoComplete="username"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-xs font-bold text-white/50 mb-1.5 tracking-wider uppercase">
                비밀번호
              </label>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 rounded-sm text-sm text-white outline-none transition-all"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  caretColor: '#CC0000',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(204,0,0,0.6)'; e.target.style.boxShadow = '0 0 0 2px rgba(204,0,0,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                autoComplete="current-password"
                required
              />
            </div>

            {/* 에러 */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm" style={{ background: 'rgba(204,0,0,0.12)', border: '1px solid rgba(204,0,0,0.3)' }}>
                <span className="text-[#CC0000] text-xs">⚠</span>
                <span className="text-[#ff6666] text-xs">{error}</span>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-black text-sm tracking-wider text-white rounded-sm transition-all mt-2"
              style={{
                background: loading ? '#660000' : '#CC0000',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs">TAES FC</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 안내 */}
          <p className="text-center text-white/25 text-xs leading-relaxed">
            로그인 정보는 팀 내부에서만 공유됩니다.
          </p>
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-6">
          <Link href="/" className="text-white/30 text-xs hover:text-white/60 transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
