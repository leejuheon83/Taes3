'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HeroAnimation from '@/components/HeroAnimation';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, orderBy, query, limit } from 'firebase/firestore';

type StaffCard = {
  id: string; name: string; role: string; career: string; order: number; photoURL: string | null;
};

function MiniStaffCard({ s }: { s: StaffCard }) {
  const isManager = s.role === '감독';
  const gold = { base:'#ffe066', glow:'#f5b800', border:'#a86800', borderHi:'#ffe066', mid:'rgba(255,200,0,0.08)' };
  return (
    <Link href="/about/staff" className="block flex-shrink-0" style={{ width: 110 }}>
      <div className="relative overflow-hidden"
        style={{
          aspectRatio: '3/4.2', borderRadius: 12,
          background: 'linear-gradient(155deg,#140e00 0%,#060400 50%,#000 100%)',
          boxShadow: `0 2px 0 ${gold.border}, 0 8px 32px rgba(0,0,0,0.95)`,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.03)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
      >
        {/* 카본 파이버 패턴 */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <defs>
            <pattern id={`cf-s-${s.id}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent"/>
              <rect x="0" y="0" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
              <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
            </pattern>
            <radialGradient id={`cg-s-${s.id}`} cx="50%" cy="38%" r="52%">
              <stop offset="0%" stopColor={gold.glow} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={gold.glow} stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cf-s-${s.id})`}/>
          <ellipse cx="50%" cy="38%" rx="58%" ry="48%" fill={`url(#cg-s-${s.id})`}/>
        </svg>
        {/* 광택 */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:12,
          background:'linear-gradient(128deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.02) 28%,transparent 52%)' }}/>
        {/* 골드 테두리 */}
        <div style={{ position:'absolute', inset:0, borderRadius:12, zIndex:22, pointerEvents:'none',
          background:`linear-gradient(145deg,${gold.borderHi} 0%,rgba(255,255,255,0.5) 18%,${gold.glow} 38%,${gold.border} 62%,${gold.borderHi}44 85%,${gold.border} 100%)`,
          padding:'1.5px', WebkitMask:'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite:'xor', maskComposite:'exclude' }}/>
        {/* 상단 골드 라인 */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, zIndex:25, pointerEvents:'none',
          background:`linear-gradient(90deg,transparent,${gold.border} 12%,${gold.glow} 32%,rgba(255,240,180,0.9) 50%,${gold.glow} 68%,${gold.border} 88%,transparent)`,
          borderRadius:'12px 12px 0 0' }}/>
        {/* TAES 로고 워터마크 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/taes-logo.png" alt="" aria-hidden style={{ position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-52%)', width:'78%', pointerEvents:'none',
          opacity:0.22, filter:'grayscale(1) brightness(2)', zIndex:2 }}/>
        {/* 상단 좌측: MANAGER 뱃지 */}
        <div style={{ position:'absolute', top:7, left:8, zIndex:15 }}>
          <div style={{ fontSize:7, fontWeight:900, color:gold.base, backgroundColor:gold.glow,
            padding:'2px 5px', borderRadius:2, letterSpacing:'0.05em',
            boxShadow:`0 0 8px ${gold.glow}80` }}>{isManager ? 'MANAGER' : s.role}</div>
        </div>
        {/* TAES FC */}
        <div style={{ position:'absolute', top:7, right:7, textAlign:'right', zIndex:15 }}>
          <div style={{ fontSize:7.5, fontWeight:900, color:gold.base, letterSpacing:'0.1em', opacity:0.9 }}>TAES</div>
          <div style={{ fontSize:5.5, fontWeight:700, color:'rgba(255,255,255,0.28)', letterSpacing:'0.1em', marginTop:1 }}>FC</div>
        </div>
        {/* 사진 */}
        <div style={{ position:'absolute', bottom:'20%', left:'50%', transform:'translateX(-50%)',
          width:'90%', height:'60%', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:10 }}>
          {s.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photoURL} alt={s.name} style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain',
              filter:`drop-shadow(0 3px 12px rgba(0,0,0,0.95)) drop-shadow(0 0 8px ${gold.glow}30)` }}/>
          ) : (
            <div style={{ fontSize:28, fontWeight:900, color:gold.glow, opacity:0.5,
              textShadow:`0 0 20px ${gold.glow}` }}>★</div>
          )}
        </div>
        {/* 하단 이름 패널 */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:15,
          background:'linear-gradient(to top,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.85) 55%,transparent 100%)',
          padding:'18px 7px 7px', borderRadius:'0 0 12px 12px' }}>
          <div style={{ height:1, marginBottom:5,
            background:`linear-gradient(to right,transparent,${gold.border} 10%,${gold.base} 32%,rgba(255,240,180,0.7) 50%,${gold.base} 68%,${gold.border} 90%,transparent)`,
            boxShadow:`0 0 4px ${gold.glow}45` }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:900, color:'#fff', letterSpacing:'0.04em',
              textShadow:`0 0 10px ${gold.glow}55` }}>{s.name}</div>
            <div style={{ fontSize:8, fontWeight:700, color:gold.base, marginTop:2, opacity:0.7 }}>{s.role}</div>
          </div>
        </div>
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
  return (
    <Link href="/players" className="block flex-shrink-0" style={{ width: 110 }}>
      <div className="relative overflow-hidden"
        style={{
          aspectRatio: '3/4.2', borderRadius: 12,
          background: 'linear-gradient(155deg,#140000 0%,#060000 50%,#000 100%)',
          boxShadow: '0 2px 0 #7a0000, 0 8px 32px rgba(0,0,0,0.95)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 0 #7a0000, 0 16px 40px rgba(0,0,0,0.98)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 0 #7a0000, 0 8px 32px rgba(0,0,0,0.95)'; }}
      >
        {/* 카본 파이버 패턴 */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <defs>
            <pattern id={`cf-m-${p.id}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent"/>
              <rect x="0" y="0" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
              <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
            </pattern>
            <radialGradient id={`cg-m-${p.id}`} cx="50%" cy="38%" r="52%">
              <stop offset="0%" stopColor="#bb0000" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#bb0000" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cf-m-${p.id})`}/>
          <ellipse cx="50%" cy="38%" rx="58%" ry="48%" fill={`url(#cg-m-${p.id})`}/>
        </svg>
        {/* 경사 광택 */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:12,
          background:'linear-gradient(128deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 28%, transparent 52%)' }}/>
        {/* 테두리 */}
        <div style={{ position:'absolute', inset:0, borderRadius:12, zIndex:22, pointerEvents:'none',
          background:'linear-gradient(145deg,#ff4444 0%,rgba(255,255,255,0.5) 18%,#dc2626 38%,#7a0000 62%,#ff444444 85%,#7a0000 100%)',
          padding:'1.5px', WebkitMask:'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite:'xor', maskComposite:'exclude' }}/>
        {/* 상단 라인 */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, zIndex:25, pointerEvents:'none',
          background:'linear-gradient(90deg,transparent,#7a0000 12%,#dc2626 32%,rgba(255,180,180,0.9) 50%,#dc2626 68%,#7a0000 88%,transparent)',
          borderRadius:'12px 12px 0 0' }}/>
        {/* TAES 로고 워터마크 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/taes-logo.png" alt="" aria-hidden style={{ position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-52%)', width:'78%', pointerEvents:'none',
          opacity:0.22, filter:'grayscale(1) brightness(2)', zIndex:2 }}/>
        {/* 상단 좌측: OVR + 포지션 */}
        <div style={{ position:'absolute', top:7, left:8, zIndex:15 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1,
            textShadow:'0 0 12px #bb0000, 0 2px 6px rgba(0,0,0,0.9)' }}>{ovr}</div>
          <div style={{ fontSize:7.5, fontWeight:900, color:'#ff5252', letterSpacing:'0.06em', marginTop:1,
            textShadow:'0 0 7px #bb0000' }}>{pos}</div>
          {p.honorary && (
            <div style={{ marginTop:3, fontSize:5.5, fontWeight:900, color:'#fbbf24',
              border:'1px solid #fbbf2460', padding:'1px 3px', borderRadius:2,
              textShadow:'0 0 5px #d4a01770' }}>★ 명예회원</div>
          )}
        </div>
        {/* TAES FC */}
        <div style={{ position:'absolute', top:7, right:7, textAlign:'right', zIndex:15 }}>
          <div style={{ fontSize:7.5, fontWeight:900, color:'#ff5252', letterSpacing:'0.1em', opacity:0.85 }}>TAES</div>
          <div style={{ fontSize:5.5, fontWeight:700, color:'rgba(255,255,255,0.28)', letterSpacing:'0.1em', marginTop:1 }}>FC</div>
        </div>
        {/* 선수 사진 */}
        <div style={{ position:'absolute', bottom:'20%', left:'50%', transform:'translateX(-50%)',
          width:'90%', height:'60%', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:10 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={p.name} style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain',
              filter:'drop-shadow(0 3px 12px rgba(0,0,0,0.95)) drop-shadow(0 0 8px #bb000030)' }}/>
          ) : (
            <div style={{ fontSize:26, fontWeight:900, color:'#dc2626', opacity:0.4,
              textShadow:'0 0 20px #bb0000' }}>#{p.no}</div>
          )}
        </div>
        {/* 하단 이름 패널 */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:15,
          background:'linear-gradient(to top,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.85) 55%,transparent 100%)',
          padding:'18px 7px 7px', borderRadius:'0 0 12px 12px' }}>
          <div style={{ height:1, marginBottom:5,
            background:'linear-gradient(to right,transparent,#7a0000 10%,#ff5252 32%,rgba(255,200,200,0.7) 50%,#ff5252 68%,#7a0000 90%,transparent)',
            boxShadow:'0 0 4px #bb000045' }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:900, color:'#fff', letterSpacing:'0.04em',
              textShadow:'0 0 10px #bb000055' }}>{p.name}</div>
            <div style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,0.35)', marginTop:2 }}>No.{p.no}</div>
          </div>
        </div>
      </div>
    </Link>
  );
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
        for (const albumDoc of albumSnap.docs) {
          const items = albumDoc.data().items as { url: string }[] | undefined;
          if (items) {
            for (const item of items) {
              if (item.url) { photos.push(item.url); if (photos.length >= 6) break; }
            }
          }
          if (photos.length >= 6) break;
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

      {/* ─── 선수 카드 섹션 ─── */}
      {players.length > 0 && (
        <section style={{ backgroundColor: '#050505', borderTop: '1px solid rgba(204,0,0,0.2)' }}>
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-xs font-black tracking-widest mb-2" style={{ color: '#CC0000' }}>OUR SQUAD</div>
                <h2 className="text-3xl font-black text-white leading-none">선수단</h2>
                <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#CC0000' }} />
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
                  <h2 className="text-2xl font-black text-white">경기 일정</h2>
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
                <h2 className="text-2xl font-black text-white">다음 경기</h2>
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
                  <h2 className="text-2xl font-black text-white">사진 갤러리</h2>
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
