'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

const USER_AUTH_KEY = 'taes-user-login';

const navItems = [
  { label: '홈', href: '/' },
  { label: '코칭스태프', href: '/about/staff' },
  { label: '전체선수', href: '/players' },
  {
    label: '경기',
    href: '/schedule',
    children: [
      { label: '경기 일정', href: '/schedule' },
      { label: '경기 결과', href: '/schedule?tab=results' },
    ],
  },
  {
    label: '미디어',
    href: '/gallery',
    children: [
      { label: '사진 갤러리', href: '/gallery' },
      { label: '경기/훈련 영상', href: '/videos' },
    ],
  },
  { label: '공지사항', href: '/notice' },
];

const NOTICE_KEY = 'taes-notices-v1';
const NOTICE_SEEN_KEY = 'taes-notice-last-seen';

function useNoticesBadge() {
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    try {
      const notices = JSON.parse(localStorage.getItem(NOTICE_KEY) ?? '[]') as { id: number }[];
      const lastSeen = Number(localStorage.getItem(NOTICE_SEEN_KEY) ?? '0');
      setHasNew(notices.some(n => n.id > lastSeen));
    } catch { /* ignore */ }
  }, []);
  return hasNew;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hasNewNotice = useNoticesBadge();

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem(USER_AUTH_KEY) === '1');
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem(USER_AUTH_KEY);
    setIsLoggedIn(false);
    router.push('/');
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/95 shadow-lg shadow-black/50' : 'bg-black/70 backdrop-blur-sm'
      }`}
    >
      {/* Top bar */}
      <div className="bg-[#CC0000] py-1 px-4">
        <div className="max-w-7xl mx-auto flex justify-center items-center gap-3 text-xs">
          <span className="font-black text-white tracking-widest">⚽ TAES FC PREMIER</span>
          <span className="text-white/40">|</span>
          <span className="font-bold text-yellow-300 flex items-center gap-1">
            <span className="inline-block animate-pulse">❤️</span> 엄마,아빠가 응원합니다.
          </span>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="relative flex-shrink-0">
              {/* 글로우 링 */}
              <div
                className="after-glow-now absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(204,0,0,0.5) 0%, transparent 70%)',
                  filter: 'blur(6px)',
                }}
              />
              <Image
                src="/taes-logo.png"
                alt="TAES FC"
                width={48}
                height={48}
                className="rounded-full relative z-10 transition-all duration-300 group-hover:scale-110"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(204,0,0,0.6))',
                }}
              />
            </div>
            <div>
              <div className="font-black text-white text-xl leading-none tracking-wider">TAES FC</div>
              <div className="text-[#CC0000] text-[10px] font-bold tracking-widest">PREMIER</div>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.href}
                className="relative group"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={`nav-link px-4 py-2 text-sm font-semibold transition-colors relative ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'text-[#CC0000]'
                      : 'text-white/90 hover:text-white'
                  } ${item.label === '선수등록' ? 'bg-[#CC0000] text-white! px-5 py-2 rounded-sm ml-2 hover:bg-[#990000] transition-colors' : ''}`}
                >
                  {item.label}
                  {item.label === '공지사항' && hasNewNotice && (
                    <span className="absolute top-1.5 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {item.children && (
                    <span className="ml-1 text-[10px] opacity-60">▼</span>
                  )}
                </Link>

                {/* Dropdown */}
                {item.children && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 w-44 bg-[#111] border border-white/10 shadow-xl py-1 z-50">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-[#CC0000] transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 로그인/로그아웃 버튼 (데스크탑) */}
          <div className="hidden lg:flex items-center ml-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm" style={{ background: 'rgba(204,0,0,0.12)', border: '1px solid rgba(204,0,0,0.3)' }}>
                  <span className="text-[#CC0000] text-xs">⚽</span>
                  <span className="text-white/70 text-xs font-bold">3333</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors rounded-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white rounded-sm transition-all hover:brightness-110"
                style={{ background: '#CC0000' }}
              >
                <span>🔑</span>
                <span>로그인</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-white p-2 flex flex-col justify-center items-center w-10 h-10 gap-0"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴"
          >
            <div className={`w-6 h-0.5 bg-white transition-all duration-300 origin-center ${mobileOpen ? 'rotate-45 translate-y-[4px]' : '-translate-y-1'}`} />
            <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : 'opacity-100'}`} />
            <div className={`w-6 h-0.5 bg-white transition-all duration-300 origin-center ${mobileOpen ? '-rotate-45 -translate-y-[4px]' : 'translate-y-1'}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden border-t border-white/10 overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ backgroundColor: '#0d0d0d' }}>
        {navItems.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className="flex items-center justify-between px-6 py-3.5 text-sm font-bold text-white/80 hover:text-white border-b border-white/5 transition-colors"
              style={{ borderLeft: pathname === item.href ? '3px solid #CC0000' : '3px solid transparent' }}
              onClick={() => setMobileOpen(false)}
            >
              <span>{item.label}</span>
              {item.label === '공지사항' && hasNewNotice && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Link>
            {item.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="block px-10 py-2.5 text-xs text-white/50 hover:text-white hover:bg-white/5 border-b border-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {child.label}
              </Link>
            ))}
          </div>
        ))}
        {/* 모바일 로그인/로그아웃 */}
        <div className="px-6 py-4 border-t border-white/10">
          {isLoggedIn ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#CC0000] text-sm">⚽</span>
                <span className="text-white/60 text-sm font-bold">3333 로그인 중</span>
              </div>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="text-xs text-white/40 font-bold px-3 py-1.5 rounded-sm"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-black text-white rounded-sm"
              style={{ background: '#CC0000' }}
              onClick={() => setMobileOpen(false)}
            >
              <span>🔑</span>
              <span>로그인</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
