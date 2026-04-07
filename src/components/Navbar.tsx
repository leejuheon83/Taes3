'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '홈', href: '/' },
  {
    label: '클럽소개',
    href: '/about',
    children: [
      { label: '클럽 소개', href: '/about' },
      { label: '코칭스태프', href: '/about/staff' },
    ],
  },
  {
    label: '선수단',
    href: '/players',
    children: [
      { label: '전체 선수', href: '/players' },
      { label: '초등 1~2학년', href: '/players?grade=1' },
      { label: '초등 3~4학년', href: '/players?grade=2' },
      { label: '초등 5~6학년', href: '/players?grade=3' },
      { label: '중등부', href: '/players?grade=4' },
    ],
  },
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
      { label: '경기 영상', href: '/videos' },
    ],
  },
  { label: '공지사항', href: '/notice' },
  { label: '선수등록', href: '/register' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();

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
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-white/90">
          <span>TAES FC PREMIER 공식 홈페이지</span>
          <span>📞 010-0000-0000 &nbsp;|&nbsp; ✉ taes@example.com</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/taes-logo.png"
              alt="TAES FC"
              width={48}
              height={48}
              className="rounded-full"
            />
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
                  className={`nav-link px-4 py-2 text-sm font-semibold transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'text-[#CC0000]'
                      : 'text-white/90 hover:text-white'
                  } ${item.label === '선수등록' ? 'bg-[#CC0000] text-white! px-5 py-2 rounded-sm ml-2 hover:bg-[#990000] transition-colors' : ''}`}
                >
                  {item.label}
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

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className="w-6 h-0.5 bg-white mb-1.5 transition-all" />
            <div className="w-6 h-0.5 bg-white mb-1.5 transition-all" />
            <div className="w-6 h-0.5 bg-white transition-all" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#111] border-t border-white/10">
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="block px-6 py-3 text-sm font-semibold text-white/90 hover:text-white hover:bg-[#CC0000] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
              {item.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="block px-10 py-2.5 text-xs text-white/60 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
