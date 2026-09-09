'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, orderBy, query, limit } from 'firebase/firestore';

type StaffCard = {
  id: string; name: string; role: string; career: string; order: number; photoURL: string | null;
};

// 메인 미리보기 카드 — 선수단 페이지와 같은 프레임을 작은 폭으로
const MINI_W = 132;
const STAT_SLOTS: [number, number][] = [
  [10.3, 64.0], [37.7, 64.0], [65.0, 64.0],
  [10.3, 75.8], [37.7, 75.8], [65.0, 75.8],
];

function MiniStaffCard({ s }: { s: StaffCard }) {
  const cls = s.role.includes('감독') ? 'fcard--gold'
    : s.role.includes('골키퍼') ? 'fcard--green'
    : s.role.includes('피지컬') ? 'fcard--purple'
    : s.role.includes('코치') ? 'fcard--blue' : '';
  const frame = cls ? `/card-frame-${cls.replace('fcard--', '')}.webp` : '/card-frame.webp';
  const career = s.career?.split('\n').map(l => l.trim()).find(Boolean) ?? '';
  return (
    <Link href="/about/staff" className="block flex-shrink-0" style={{ width: MINI_W }}>
      <div className={`fcard ${cls} mini-card`}>
        {s.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="fcard__shot is-photo" src={s.photoURL} alt={s.name} draggable={false} />
        ) : (
          <div className="fcard__noshot">{s.name.charAt(0)}</div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fcard__frame" src={frame} alt="" aria-hidden draggable={false} />
        <div className="fcard__ovr">
          <span className="fcard__ovr-n is-word">{s.role}</span>
        </div>
        <h3 className={`fcard__name${s.name.length > 4 ? ' is-long' : ''}`}>{s.name}</h3>
        <div className="fcard__num">
          <div className="fcard__num-in">
            <i className="fcard__num-d" aria-hidden />
            <span className="fcard__num-lab">SEASON</span>
            <b className="fcard__num-n">2026</b>
            <i className="fcard__num-d" aria-hidden />
          </div>
        </div>
        {career && (
          <>
            <div className="fcard__note" style={{ top: '64%', height: '9.4%' }}>
              <span className="fcard__note-lab" style={{ margin: 0 }}>CAREER</span>
            </div>
            <div className="fcard__note" style={{ top: '75.8%', height: '9.4%' }}>
              <div>{career}</div>
            </div>
          </>
        )}
        <div className="fcard__shine d3" aria-hidden />
      </div>
    </Link>
  );
}

type PlayerCard = {
  id: string; no: number; name: string;
  pos: string; positions: string[];
  honorary: boolean;
  photo?: string; photoURL?: string | null;
  stats: { spd: number; sht: number; pas: number; dri: number; def: number; phy: number };
};

function MiniCard({ p }: { p: PlayerCard }) {
  const s = p.stats ?? { spd: 0, sht: 0, pas: 0, dri: 0, def: 0, phy: 0 };
  const ovr = Math.round((s.spd + s.sht + s.pas + s.dri + s.def + s.phy) / 6);
  const photo = p.photo || p.photoURL || undefined;
  const pos = (p.positions?.length ? p.positions : [p.pos]).join('·');
  const shine = (String(p.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4) + 1;
  return (
    <Link href="/players" className="block flex-shrink-0" style={{ width: MINI_W }}>
      <div className="fcard mini-card">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="fcard__shot" src={photo} alt={p.name} draggable={false} />
        ) : (
          <div className="fcard__noshot">#{p.no}</div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fcard__frame" src="/card-frame.webp" alt="" aria-hidden draggable={false} />
        <div className="fcard__ovr">
          <span className="fcard__ovr-n">{ovr}</span>
          <span className="fcard__ovr-pos">{pos}</span>
        </div>
        <h3 className={`fcard__name${p.name.length > 4 ? ' is-long' : ''}`}>{p.name}</h3>
        <div className="fcard__num">
          <div className="fcard__num-in">
            <i className="fcard__num-d" aria-hidden />
            <span className="fcard__num-lab">No.</span>
            <b className="fcard__num-n">{p.no}</b>
            <i className="fcard__num-d" aria-hidden />
          </div>
        </div>
        {[
          { k: 'PAC', v: s.spd }, { k: 'SHO', v: s.sht }, { k: 'PAS', v: s.pas },
          { k: 'DRI', v: s.dri }, { k: 'DEF', v: s.def }, { k: 'PHY', v: s.phy },
        ].map(({ k, v }, i) => (
          <div key={k} className="fcard__stat" style={{ left: `${STAT_SLOTS[i][0]}%`, top: `${STAT_SLOTS[i][1]}%` }}>
            <span className="fcard__stat-v">{v}</span>
            <span className="fcard__stat-k">{k}</span>
          </div>
        ))}
        <div className={`fcard__shine d${shine}`} aria-hidden />
      </div>
    </Link>
  );
}


// 오늘부터 경기일까지 남은 일수 (자정 기준)
function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

type MatchItem = {
  id: string;
  date: string;
  day: string;
  home: string;
  away: string;
  venue: string;
  grade: string;
  result: '승' | '무' | '패' | null;
  homeScore: number | null;
  awayScore: number | null;
  time: string;
};

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
  const [notices, setNotices] = useState<{ id: string; category: string; title: string; date: string; views: number }[]>([]);
  const [featuredPhoto, setFeaturedPhoto] = useState<string | null>(null);
  const [featuredVideo, setFeaturedVideo] = useState<{ id: string; title: string; type: 'upload' | 'youtube'; youtubeId?: string; date: string } | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [nextMatch, setNextMatch] = useState<MatchItem | null>(null);
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [manager, setManager] = useState<StaffCard | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load players
        const pq = query(collection(db, 'players'), orderBy('no', 'asc'));
        const playersSnap = await getDocs(pq);
        const counts: Record<string, number> = { '3학년': 0 };
        const loadedPlayers: PlayerCard[] = [];
        playersSnap.forEach(d => {
          const data = d.data();
          const grade = data.grade;
          if (grade in counts) counts[grade]++;
          loadedPlayers.push({
            id: d.id, ...data,
            stats: data.stats ?? { spd: 0, sht: 0, pas: 0, dri: 0, def: 0, phy: 0 },
          } as PlayerCard);
        });
        setGradeCounts(counts);
        setPlayers(loadedPlayers);

        // Load manager (감독) from staff collection
        const staffSnap = await getDocs(query(collection(db, 'staff'), orderBy('order', 'asc')));
        const mgr = staffSnap.docs.find(d => d.data().role === '감독');
        if (mgr) setManager({ id: mgr.id, ...mgr.data() } as StaffCard);

        // Load latest gallery photos (최대 6장)
        const albumSnap = await getDocs(query(collection(db, 'albums'), orderBy('date', 'desc')));
        const photos: string[] = [];
        // 사진 본문은 albums/{id}/photos 하위 문서에 base64로 저장되어 있다.
        // 앨범당 필요한 만큼만 받아 전송량을 줄인다.
        for (const albumDoc of albumSnap.docs) {
          const need = 6 - photos.length;
          if (need <= 0) break;
          const photoSnap = await getDocs(
            query(collection(db, 'albums', albumDoc.id, 'photos'), limit(need))
          );
          for (const ph of photoSnap.docs) {
            const data = (ph.data() as { data?: string }).data;
            if (data) photos.push(data);
          }
        }
        setGalleryPhotos(photos);
      } catch { /* ignore */ }

      try {
        // Load latest notices
        const q = query(collection(db, 'notices'), orderBy('date', 'desc'), limit(5));
        const snap = await getDocs(q);
        const loaded = snap.docs.map(d => ({
          id: d.id,
          category: d.data().category,
          title: d.data().title,
          date: d.data().date,
          views: d.data().views ?? 0,
        }));
        setNotices(loaded);
      } catch { /* ignore */ }

      try {
        // Load matches from Firestore
        const mq = query(collection(db, 'matches'), orderBy('date', 'desc'), limit(10));
        const msnap = await getDocs(mq);
        const loadedMatches: MatchItem[] = msnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<MatchItem, 'id'>),
        }));
        setMatches(loadedMatches);
        // Find next upcoming match (no result yet, soonest date)
        const today = new Date().toISOString().split('T')[0];
        const upcoming = loadedMatches
          .filter(m => !m.result && m.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));
        setNextMatch(upcoming[0] ?? null);
      } catch { /* ignore */ }

      try {
        // Load featured photo and video from settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.featuredPhoto?.url) setFeaturedPhoto(data.featuredPhoto.url);
          if (data.featuredVideo) setFeaturedVideo(data.featuredVideo);
        }
      } catch { /* ignore */ }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: 620 }}>
        {/* 배경 (축구하는 아이들) */}
        <Image
          src="/taes-hero-bg.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* 가독성 오버레이 (은은하게) */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(90deg, rgba(4,4,4,0.50) 0%, rgba(4,4,4,0.26) 42%, rgba(4,4,4,0.08) 72%, rgba(4,4,4,0.26) 100%)',
        }} />
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none" style={{
          background: 'linear-gradient(to top, #050505 0%, transparent 100%)',
        }} />

        <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-16">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-8">

            {/* 좌: 타이틀 로고 + 문구 */}
            <div className="flex-1 min-w-0 text-center lg:text-left">
              <div className="mx-auto lg:mx-0" style={{ maxWidth: 560 }}>
              <div className="badge-align inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
                style={{ background: 'rgba(140,0,0,0.38)', border: '1px solid rgba(255,60,40,0.55)' }}>
                <span className="text-sm">⚽</span>
                <span className="text-[13px] sm:text-sm font-black tracking-wide" style={{ color: '#ff5a45' }}>
                  2026 시즌 진행 중
                </span>
              </div>

              <div className="title-wrap">
                <Image
                  src="/taes-title.png"
                  alt="TAES FC PREMIER"
                  width={1178}
                  height={544}
                  priority
                  sizes="(max-width: 1024px) 84vw, 560px"
                  className="w-full h-auto"
                  style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.7))' }}
                />
                <div className="title-shine" aria-hidden />
              </div>

              <p className="text-white/75 text-base sm:text-lg leading-relaxed mt-3">
                서툰 시작도 괜찮습니다.<br />
                끝까지 해내는 아이로 자라는 과정,<br />
                그것이 바로 태즈가 말하는 성장입니다.
              </p>
              </div>
            </div>

            {/* 우: 엠블럼 (외곽을 도는 불빛) */}
            <div className="flex-shrink-0" style={{ width: 'min(58vw, 370px)' }}>
              <Image
                src="/taes-emblem.png"
                alt="TAES FC 엠블럼"
                width={983}
                height={999}
                priority
                sizes="(max-width: 1024px) 58vw, 370px"
                className="w-full h-auto relative"
                style={{ filter: 'drop-shadow(0 0 30px rgba(204,0,0,0.45)) drop-shadow(0 12px 28px rgba(0,0,0,0.7))' }}
              />
            </div>

          </div>
        </div>
      </section>

      {/* ─── 다음 경기 D-day ─── */}
      {nextMatch && (() => {
        const d = daysUntil(nextMatch.date);
        if (d === null || d < 0) return null;
        const label = d === 0 ? 'TODAY' : `D-${d}`;
        return (
          <Link href="/schedule" className="block group">
            <div className="border-y" style={{
              borderColor: 'rgba(204,0,0,0.35)',
              background: 'linear-gradient(90deg, rgba(60,0,0,0.9) 0%, rgba(20,0,0,0.9) 55%, rgba(60,0,0,0.9) 100%)',
            }}>
              <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
                <span className="dday-chip">{label}</span>
                <span className="text-white/45 text-xs font-bold tracking-widest">다음 경기</span>
                <span className="text-white font-black text-sm sm:text-base">
                  {nextMatch.home} <span style={{ color: '#ff3b25' }}>vs</span> {nextMatch.away}
                </span>
                <span className="text-white/45 text-xs">
                  {nextMatch.date.replace(/-/g, '.')} {nextMatch.day && `(${nextMatch.day})`} {nextMatch.time}
                  {nextMatch.venue && ` · 📍 ${nextMatch.venue}`}
                </span>
                <span className="text-white/30 text-xs group-hover:text-white/60 transition-colors">일정 보기 →</span>
              </div>
            </div>
          </Link>
        );
      })()}

      {/* ─── 태즈의 순간들 ─── */}
      <section style={{ backgroundColor: '#080808', borderTop: '2px solid #CC0000' }}>
        <div className="max-w-7xl mx-auto px-4 py-14">

          {/* 섹션 헤더 */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="section-eyebrow mb-2">OUR TEAM</div>
              <h2 className="text-3xl section-title leading-none">태즈의 순간들</h2>
              <div className="section-rule mt-2" />
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

      {/* ─── 선수 카드 섹션 ─── */}
      {players.length > 0 && (
        <section style={{ backgroundColor: '#050505', borderTop: '1px solid rgba(204,0,0,0.2)' }}>
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="section-eyebrow mb-2">OUR SQUAD</div>
                <h2 className="text-3xl section-title leading-none">선수단</h2>
                <div className="section-rule mt-2" />
              </div>
              <Link href="/players" className="text-sm font-bold tracking-wider hover:text-red-500 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                전체보기 →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {manager && <MiniStaffCard key={manager.id} s={manager} />}
              {players.map(p => <MiniCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Notices + Schedule */}
          <div className="lg:col-span-2 space-y-12">

            {/* Notices */}
            <div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl section-title">공지사항</h2>
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
                      <span className={`${categoryColors[n.category] || 'bg-gray-600'} text-white text-[10px] font-bold px-2 py-0.5 flex-shrink-0`}>{n.category}</span>
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
                  <h2 className="text-2xl section-title">경기 일정</h2>
                  <div className="section-divider mt-2" />
                </div>
                <Link href="/schedule" className="text-sm text-white/50 hover:text-red-500 transition-colors">전체보기 →</Link>
              </div>
              {matches.length === 0 ? (
                <div className="py-10 text-center text-white/20 border border-white/5 text-sm" style={{ backgroundColor: '#0a0a0a' }}>
                  등록된 경기 일정이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.slice(0, 5).map((s) => {
                    const hasResult = !!s.result;
                    const scoreText = hasResult && s.homeScore !== null && s.awayScore !== null
                      ? `${s.homeScore} : ${s.awayScore}` : null;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-4 p-4 border ${hasResult ? 'border-white/5' : 'border-red-900/40'}`}
                        style={{ backgroundColor: hasResult ? '#080808' : '#0a0a0a' }}
                      >
                        <div className={`text-center w-14 flex-shrink-0 ${hasResult ? 'opacity-40' : ''}`}>
                          <div className="text-lg font-black text-white">{s.date?.slice(5).replace('-', '.')}</div>
                          <div className="text-xs text-white/50">{s.day}요일</div>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className={`font-bold text-sm truncate ${hasResult ? 'text-white/40' : 'text-white'}`}>{s.home}</span>
                          {scoreText ? (
                            <span className="font-black text-sm px-2 py-1 whitespace-nowrap flex-shrink-0" style={{ backgroundColor: '#0e0e0e', color: 'rgba(255,255,255,0.7)' }}>{scoreText}</span>
                          ) : (
                            <span className="font-bold text-xs px-2 py-1 flex-shrink-0" style={{ backgroundColor: 'rgba(204,0,0,0.2)', color: '#CC0000' }}>VS</span>
                          )}
                          <span className={`font-bold text-sm truncate ${hasResult ? 'text-white/40' : 'text-white'}`}>{s.away}</span>
                        </div>
                        <div className="text-right text-xs text-white/40 flex-shrink-0">
                          <div>{s.grade}</div>
                          <div>{s.venue}</div>
                        </div>
                        {!hasResult && (
                          <span className="text-white text-[10px] font-bold px-2 py-1 flex-shrink-0" style={{ backgroundColor: '#CC0000' }}>예정</span>
                        )}
                        {hasResult && (
                          <span className="text-white text-[10px] font-bold px-2 py-1 flex-shrink-0" style={{ backgroundColor: s.result === '승' ? '#16a34a' : s.result === '패' ? '#dc2626' : '#6b7280' }}>{s.result}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-8">

            {/* Next match */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl section-title">다음 경기</h2>
                <div className="section-divider mt-2" />
              </div>
              {nextMatch ? (
                <div className="border p-6" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(204,0,0,0.3)' }}>
                  <div className="text-xs font-bold tracking-wider mb-4" style={{ color: '#CC0000' }}>{nextMatch.grade}</div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 mx-auto" style={{ backgroundColor: '#CC0000' }}>
                        {nextMatch.home.charAt(0)}
                      </div>
                      <div className="text-white font-bold text-sm">{nextMatch.home}</div>
                      <div className="text-white/40 text-xs">홈</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/30 text-xs mb-1">{nextMatch.date}</div>
                      <div className="text-white font-black text-2xl">VS</div>
                      <div className="text-white/30 text-xs mt-1">{nextMatch.time}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-14 h-14 border border-white/10 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 mx-auto" style={{ backgroundColor: '#0e0e0e' }}>
                        {nextMatch.away.charAt(0)}
                      </div>
                      <div className="text-white font-bold text-sm">{nextMatch.away}</div>
                      <div className="text-white/40 text-xs">원정</div>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs py-2 px-3 text-center" style={{ backgroundColor: '#050505' }}>
                    📍 {nextMatch.venue}
                  </div>
                </div>
              ) : (
                <div className="border p-8 text-center" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-4xl mb-3 opacity-20">⚽</div>
                  <div className="text-white/30 text-sm font-bold">예정된 경기가 없습니다</div>
                </div>
              )}
            </div>

            {/* Gallery preview */}
            <div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl section-title">사진 갤러리</h2>
                  <div className="section-divider mt-2" />
                </div>
                <Link href="/gallery" className="text-sm text-white/50 hover:text-red-500 transition-colors">더보기 →</Link>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {galleryPhotos.length > 0
                  ? galleryPhotos.map((url, i) => (
                    <Link key={i} href="/gallery"
                      className="aspect-square overflow-hidden group relative block"
                      style={{ backgroundColor: '#0e0e0e' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"/>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(204,0,0,0.25)' }}/>
                    </Link>
                  ))
                  : Array.from({ length: 6 }).map((_, i) => (
                    <Link key={i} href="/gallery"
                      className="aspect-square border border-white/10 flex items-center justify-center text-white/10 text-3xl"
                      style={{ backgroundColor: '#0e0e0e' }}>
                      <span>⚽</span>
                    </Link>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
