'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HeroAnimation from '@/components/HeroAnimation';


const schedule = [
  { date: '04.12', day: '토', home: 'TAES FC', away: '드래곤 FC', venue: '○○구장', grade: '3학년', result: null },
  { date: '04.19', day: '토', home: 'TAES FC', away: '스타 유나이티드', venue: '△△구장', grade: '3학년', result: null },
  { date: '04.26', day: '일', home: '블루 FC', away: 'TAES FC', venue: '□□구장', grade: '3학년', result: null },
  { date: '03.29', day: '토', home: 'TAES FC', away: '레드 스타', venue: '○○구장', grade: '3학년', result: '3 : 1' },
  { date: '03.22', day: '토', home: '그린 FC', away: 'TAES FC', venue: '△△구장', grade: '3학년', result: '1 : 2' },
];

const stats = [
  { label: '등록 선수', value: '22', unit: '명' },
  { label: '이번 시즌 승', value: '8', unit: '승' },
  { label: '득점', value: '24', unit: '골' },
  { label: '3학년', value: '1', unit: '개반' },
];

const GRADE_INFO = [
  { key: '3학년', name: '3학년', icon: '🔥' },
];

const categoryColors: Record<string, string> = {
  중요: 'bg-red-600',
  훈련: 'bg-blue-600',
  행사: 'bg-green-600',
  등록: 'bg-yellow-600',
  공지: 'bg-gray-600',
};

export default function Home() {
  const [gradeCounts, setGradeCounts] = useState<Record<string, number>>({ '3학년': 0 });
  const [notices, setNotices] = useState<{ id: number; category: string; title: string; date: string; views: number }[]>([]);
  const [featuredPhoto, setFeaturedPhoto] = useState<string | null>(null);
  const [featuredVideo, setFeaturedVideo] = useState<{ id: number; title: string; type: 'upload' | 'youtube'; youtubeId?: string; date: string } | null>(null);

  useEffect(() => {
    try {
      const players = JSON.parse(localStorage.getItem('taes-players-v2') ?? '[]');
      const counts: Record<string, number> = { '3학년': 0 };
      for (const p of players) {
        if (p.grade in counts) counts[p.grade]++;
      }
      setGradeCounts(counts);
    } catch {}

    try {
      const all = JSON.parse(localStorage.getItem('taes-notices-v1') ?? '[]');
      setNotices(all.slice(0, 5));
    } catch {}

    try {
      const fp = localStorage.getItem('taes-featured-photo');
      if (fp) setFeaturedPhoto(fp);
    } catch {}

    try {
      const fv = localStorage.getItem('taes-featured-video');
      if (fv) setFeaturedVideo(JSON.parse(fv));
    } catch {}
  }, []);

  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden hero-gradient">
        {/* 배경 격자 */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #CC0000 0, #CC0000 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 tracking-wider">
              ⚽ 2026 시즌 진행 중
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-4 tracking-tight hero-text-glow">
              TAES FC
              <span className="block" style={{ color: '#CC0000' }}>PREMIER</span>
            </h1>
            <p className="text-white/60 text-lg mb-8 max-w-md">
              서툰 시작도 괜찮습니다.<br />
              끝까지 해내는 아이로 자라는 과정,<br />
              그것이 바로 태즈가 말하는 성장입니다.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/register" className="font-bold px-8 py-3.5 transition-colors text-white" style={{ backgroundColor: '#CC0000' }}>
                선수 등록 →
              </Link>
              <Link href="/schedule" className="border border-white/30 text-white font-bold px-8 py-3.5 transition-colors hover:text-white" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                경기 일정
              </Link>
            </div>
          </div>

          {/* 킥 인트로 애니메이션 */}
          <HeroAnimation />
        </div>
      </section>


      {/* ─── 태즈의 순간들 ─── */}
      <section style={{ backgroundColor: '#080808', borderTop: '2px solid #CC0000' }}>
        <div className="max-w-7xl mx-auto px-4 py-14">

          {/* 섹션 헤더 */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-black tracking-widest mb-2" style={{ color: '#CC0000' }}>OUR TEAM</div>
              <h2 className="text-3xl font-black text-white leading-none">태즈의 순간들</h2>
              <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#CC0000' }} />
            </div>
          </div>

          {/* 2컬럼 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── 왼쪽: 메인 대표사진 ── */}
            <div className="flex flex-col gap-2">
              <Link href="/gallery"
                className="relative overflow-hidden group block"
                style={{ aspectRatio: '16/9' }}>
                {featuredPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredPhoto}
                      alt="메인 사진"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* 하단 그라데이션 오버레이 */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                    {/* 호버 오버레이 */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
                      <div className="flex items-center gap-2 px-5 py-2.5 font-bold text-sm text-white border border-white/60" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        📸 갤러리 전체보기 →
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border border-dashed" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(204,0,0,0.2)' }}>
                    <div className="text-4xl mb-3 opacity-20">📸</div>
                    <div className="text-white/30 text-sm font-bold">메인 사진 미설정</div>
                    <div className="text-white/15 text-xs mt-1">갤러리에서 사진을 선택하세요</div>
                  </div>
                )}
                {/* 뱃지 */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 text-white text-[11px] font-black tracking-wider" style={{ backgroundColor: 'rgba(204,0,0,0.92)', backdropFilter: 'blur(4px)' }}>
                  <span>📷</span> PHOTO
                </div>
              </Link>
              {/* 하단 링크 */}
              <div className="flex justify-end">
                <Link href="/gallery" className="text-xs font-bold tracking-wider transition-colors hover:text-red-500" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  갤러리 더보기 →
                </Link>
              </div>
            </div>

            {/* ── 오른쪽: 메인 영상 ── */}
            <div className="flex flex-col gap-2">
              <Link href="/videos"
                className="relative overflow-hidden group block"
                style={{ aspectRatio: '16/9' }}>
                {featuredVideo?.type === 'youtube' && featuredVideo.youtubeId ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${featuredVideo.youtubeId}/hqdefault.jpg`}
                      alt={featuredVideo.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* 하단 그라데이션 + 텍스트 */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
                      <div className="text-white font-black text-base leading-snug line-clamp-1">{featuredVideo.title}</div>
                      <div className="text-white/50 text-xs mt-0.5">{featuredVideo.date}</div>
                    </div>
                    {/* 플레이 버튼 */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-red-700"
                        style={{ backgroundColor: 'rgba(204,0,0,0.85)', boxShadow: '0 0 24px rgba(204,0,0,0.5)' }}>
                        ▶
                      </div>
                    </div>
                  </>
                ) : featuredVideo ? (
                  <>
                    <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d0d0d, #1a0000)' }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl mb-3 transition-all group-hover:scale-110" style={{ backgroundColor: 'rgba(204,0,0,0.85)' }}>▶</div>
                      <div className="text-white font-bold text-sm px-6 text-center line-clamp-2">{featuredVideo.title}</div>
                      <div className="text-white/40 text-xs mt-1">{featuredVideo.date}</div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border border-dashed" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-4xl mb-3 opacity-20">🎬</div>
                    <div className="text-white/30 text-sm font-bold">메인 영상 미설정</div>
                    <div className="text-white/15 text-xs mt-1">영상 페이지에서 선택하세요</div>
                  </div>
                )}
                {/* 뱃지 */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 text-white text-[11px] font-black tracking-wider" style={{ backgroundColor: 'rgba(204,0,0,0.92)', backdropFilter: 'blur(4px)' }}>
                  <span>🎬</span> VIDEO
                </div>
              </Link>
              {/* 하단 링크 */}
              <div className="flex justify-end">
                <Link href="/videos" className="text-xs font-bold tracking-wider transition-colors hover:text-red-500" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  영상 더보기 →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Notices + Schedule */}
          <div className="lg:col-span-2 space-y-12">

            {/* Notices */}
            <div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">공지사항</h2>
                  <div className="section-divider mt-2" />
                </div>
                <Link href="/notice" className="text-sm text-white/50 hover:text-red-500 transition-colors">전체보기 →</Link>
              </div>
              {notices.length === 0 ? (
                <div className="py-10 text-center text-white/20 border border-white/5 text-sm" style={{ backgroundColor: '#0a0a0a' }}>
                  등록된 공지가 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {notices.map((n) => (
                    <Link
                      key={n.id}
                      href={`/notice/${n.id}`}
                      className="flex items-center gap-4 py-4 px-4 border border-white/5 hover:border-red-800/50 transition-all group"
                      style={{ backgroundColor: '#0a0a0a' }}
                    >
                      <span className={`${categoryColors[n.category]} text-white text-[10px] font-bold px-2 py-0.5 flex-shrink-0`}>{n.category}</span>
                      <span className="flex-1 text-white/80 group-hover:text-white text-sm font-medium truncate transition-colors">{n.title}</span>
                      <div className="flex items-center gap-4 text-white/30 text-xs flex-shrink-0">
                        <span>👁 {n.views}</span>
                        <span>{n.date}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">경기 일정</h2>
                  <div className="section-divider mt-2" />
                </div>
                <Link href="/schedule" className="text-sm text-white/50 hover:text-red-500 transition-colors">전체보기 →</Link>
              </div>
              <div className="space-y-3">
                {schedule.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 border ${s.result ? 'border-white/5' : 'border-red-900/40'}`}
                    style={{ backgroundColor: s.result ? '#080808' : '#0a0a0a' }}
                  >
                    <div className={`text-center w-14 flex-shrink-0 ${s.result ? 'opacity-40' : ''}`}>
                      <div className="text-lg font-black text-white">{s.date}</div>
                      <div className="text-xs text-white/50">{s.day}요일</div>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <span className={`font-bold text-sm ${s.result ? 'text-white/40' : 'text-white'}`}>{s.home}</span>
                      {s.result ? (
                        <span className="text-white/70 font-black text-sm px-3 py-1" style={{ backgroundColor: '#0e0e0e' }}>{s.result}</span>
                      ) : (
                        <span className="font-bold text-xs px-3 py-1" style={{ backgroundColor: 'rgba(204,0,0,0.2)', color: '#CC0000' }}>VS</span>
                      )}
                      <span className={`font-bold text-sm ${s.result ? 'text-white/40' : 'text-white'}`}>{s.away}</span>
                    </div>
                    <div className="text-right text-xs text-white/40 flex-shrink-0">
                      <div>{s.grade}</div>
                      <div>{s.venue}</div>
                    </div>
                    {!s.result && (
                      <span className="text-white text-[10px] font-bold px-2 py-1 flex-shrink-0" style={{ backgroundColor: '#CC0000' }}>예정</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-8">

            {/* Next match */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white">다음 경기</h2>
                <div className="section-divider mt-2" />
              </div>
              <div className="border p-6" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(204,0,0,0.3)' }}>
                <div className="text-xs font-bold tracking-wider mb-4" style={{ color: '#CC0000' }}>2025 춘계 리그 · 3학년</div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 mx-auto" style={{ backgroundColor: '#CC0000' }}>T</div>
                    <div className="text-white font-bold text-sm">TAES FC</div>
                    <div className="text-white/40 text-xs">홈</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/30 text-xs mb-1">04월 12일 (토)</div>
                    <div className="text-white font-black text-2xl">VS</div>
                    <div className="text-white/30 text-xs mt-1">10:00 AM</div>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 border border-white/10 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 mx-auto" style={{ backgroundColor: '#0e0e0e' }}>D</div>
                    <div className="text-white font-bold text-sm">드래곤 FC</div>
                    <div className="text-white/40 text-xs">원정</div>
                  </div>
                </div>
                <div className="text-white/50 text-xs py-2 px-3 text-center" style={{ backgroundColor: '#050505' }}>
                  📍 ○○구장 제1경기장
                </div>
              </div>
            </div>

            {/* Gallery preview */}
            <div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">사진 갤러리</h2>
                  <div className="section-divider mt-2" />
                </div>
                <Link href="/gallery" className="text-sm text-white/50 hover:text-red-500 transition-colors">더보기 →</Link>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Link
                    key={i}
                    href="/gallery"
                    className="aspect-square border border-white/10 hover:border-red-800/50 transition-colors flex items-center justify-center text-white/10 text-3xl hover:text-white/20 group"
                    style={{ backgroundColor: '#0e0e0e' }}
                  >
                    <span className="group-hover:scale-110 transition-transform">⚽</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
