'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, getDoc, doc, setDoc, deleteDoc, orderBy, query
} from 'firebase/firestore';

// ── 이미지 로딩 헬퍼 ──
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ── 카드 → Canvas 생성 ──
async function generateCardCanvas(player: Player): Promise<HTMLCanvasElement> {
  const W = 400, H = 560, R = 14;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d')!;

  // 배경 그라디언트
  const bg = ctx.createLinearGradient(W * 0.6, 0, 0, H);
  bg.addColorStop(0, '#140000'); bg.addColorStop(0.5, '#060000'); bg.addColorStop(1, '#000');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.fill();

  // 카본 파이버
  ctx.save(); ctx.globalAlpha = 0.028;
  for (let x = 0; x < W; x += 4) for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + 2, y + 2, 2, 2);
  }
  ctx.restore();

  // 중앙 글로우
  const glow = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, W*0.6);
  glow.addColorStop(0, 'rgba(187,0,0,0.18)'); glow.addColorStop(1, 'rgba(187,0,0,0)');
  ctx.fillStyle = glow; ctx.beginPath();
  ctx.ellipse(W/2, H*0.38, W*0.58, H*0.48, 0, 0, Math.PI*2); ctx.fill();

  // TAES 로고 워터마크
  try {
    const logo = await loadImg('/taes-logo.png');
    ctx.save(); ctx.globalAlpha = 0.18;
    const lsz = W * 0.78;
    ctx.drawImage(logo, (W - lsz)/2, H*0.5 - lsz*0.52, lsz, lsz);
    ctx.restore();
  } catch { /* ignore */ }

  // 선수 사진
  const photoSrc = player.photo || player.photoURL;
  if (photoSrc) {
    try {
      const ph = await loadImg(photoSrc);
      ctx.save();
      const maxH = H * 0.62, maxW = W * 0.92;
      let dw = ph.width, dh = ph.height;
      if (dh > maxH) { dw = dw * maxH / dh; dh = maxH; }
      if (dw > maxW) { dh = dh * maxW / dw; dw = maxW; }
      ctx.drawImage(ph, (W - dw)/2, H * 0.79 - dh, dw, dh);
      ctx.restore();
    } catch { /* ignore */ }
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(220,38,38,0.4)';
    ctx.font = '900 80px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`#${player.no}`, W/2, H * 0.53);
    ctx.textAlign = 'left'; ctx.restore();
  }

  // 상단 광택
  const shine = ctx.createLinearGradient(0, 0, W*0.7, H*0.55);
  shine.addColorStop(0, 'rgba(255,255,255,0.10)'); shine.addColorStop(0.3, 'rgba(255,255,255,0.025)'); shine.addColorStop(0.52, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.fill();

  // 하단 패널 배경
  const btm = ctx.createLinearGradient(0, H*0.72, 0, H);
  btm.addColorStop(0, 'rgba(0,0,0,0)'); btm.addColorStop(0.3, 'rgba(0,0,0,0.88)'); btm.addColorStop(1, 'rgba(0,0,0,0.97)');
  ctx.fillStyle = btm; ctx.beginPath(); ctx.roundRect(0, H*0.55, W, H*0.45, [0,0,R,R]); ctx.fill();

  // 하단 글로우
  const btmGlow = ctx.createRadialGradient(W/2, H, 0, W/2, H, W*0.75);
  btmGlow.addColorStop(0, 'rgba(187,0,0,0.28)'); btmGlow.addColorStop(1, 'rgba(187,0,0,0)');
  ctx.fillStyle = btmGlow; ctx.beginPath(); ctx.roundRect(0, H*0.6, W, H*0.4, [0,0,R,R]); ctx.fill();

  // 메탈릭 테두리
  const bdr = ctx.createLinearGradient(0, 0, W, H);
  bdr.addColorStop(0,'#ff4444'); bdr.addColorStop(0.18,'rgba(255,255,255,0.55)');
  bdr.addColorStop(0.38,'#dc2626'); bdr.addColorStop(0.62,'#7a0000');
  bdr.addColorStop(0.85,'rgba(255,68,68,0.27)'); bdr.addColorStop(1,'#7a0000');
  ctx.strokeStyle = bdr; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(1.5, 1.5, W-3, H-3, R-1); ctx.stroke();

  // 상단 라인
  const topL = ctx.createLinearGradient(0, 0, W, 0);
  topL.addColorStop(0,'transparent'); topL.addColorStop(0.12,'#7a0000');
  topL.addColorStop(0.32,'#dc2626'); topL.addColorStop(0.5,'rgba(255,180,180,0.9)');
  topL.addColorStop(0.68,'#dc2626'); topL.addColorStop(0.88,'#7a0000'); topL.addColorStop(1,'transparent');
  ctx.fillStyle = topL; ctx.fillRect(0, 0, W, 2);

  // OVR
  const ovr = Math.round((player.stats.spd+player.stats.sht+player.stats.pas+player.stats.dri+player.stats.def+player.stats.phy)/6);
  ctx.save(); ctx.shadowColor='#bb0000'; ctx.shadowBlur=24;
  ctx.fillStyle='#fff'; ctx.font='900 56px system-ui,sans-serif';
  ctx.fillText(String(ovr), 18, 70); ctx.restore();

  // 포지션
  const pos = (player.positions?.length ? player.positions : [player.pos]).join('·');
  ctx.save(); ctx.shadowColor='#bb0000'; ctx.shadowBlur=14;
  ctx.fillStyle='#ff5252'; ctx.font='900 18px system-ui,sans-serif';
  ctx.fillText(pos, 18, 96); ctx.restore();

  // 명예회원 배지
  if (player.honorary) {
    ctx.save();
    ctx.fillStyle='rgba(251,191,36,0.12)'; ctx.strokeStyle='rgba(251,191,36,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(18, 104, 82, 18, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fbbf24'; ctx.font='900 11px system-ui,sans-serif';
    ctx.fillText('★ 명예회원', 22, 117); ctx.restore();
  }

  // TAES FC
  ctx.save(); ctx.textAlign='right';
  ctx.fillStyle='#ff5252'; ctx.font='900 19px system-ui,sans-serif'; ctx.fillText('TAES', W-16, 30);
  ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.font='700 13px system-ui,sans-serif'; ctx.fillText('FC', W-16, 48);
  ctx.textAlign='left'; ctx.restore();

  // 구분선
  const sepY = H * 0.795;
  const sep = ctx.createLinearGradient(0, 0, W, 0);
  sep.addColorStop(0,'transparent'); sep.addColorStop(0.1,'#7a0000');
  sep.addColorStop(0.32,'#ff5252'); sep.addColorStop(0.5,'rgba(255,200,200,0.75)');
  sep.addColorStop(0.68,'#ff5252'); sep.addColorStop(0.9,'#7a0000'); sep.addColorStop(1,'transparent');
  ctx.strokeStyle=sep; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,sepY); ctx.lineTo(W,sepY); ctx.stroke();

  // 이름
  ctx.save(); ctx.textAlign='center'; ctx.shadowColor='rgba(187,0,0,0.5)'; ctx.shadowBlur=18;
  ctx.fillStyle='#fff'; ctx.font='900 26px system-ui,sans-serif';
  ctx.fillText(player.name, W/2, H*0.845); ctx.restore();

  // No. 배지
  ctx.save();
  ctx.fillStyle='rgba(187,0,0,0.12)'; ctx.strokeStyle='rgba(220,38,38,0.38)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect((W-72)/2, H*0.858, 72, 22, 11); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.font='700 13px system-ui,sans-serif'; ctx.textAlign='center';
  ctx.fillText(`No.${player.no}`, W/2, H*0.858+15); ctx.restore();

  // 스탯 그리드
  const statsArr = [
    {k:'PAC',v:player.stats.spd},{k:'SHO',v:player.stats.sht},{k:'PAS',v:player.stats.pas},
    {k:'DRI',v:player.stats.dri},{k:'DEF',v:player.stats.def},{k:'PHY',v:player.stats.phy},
  ];
  const sy = H * 0.9, cw = W / 3;
  statsArr.forEach(({k,v},i) => {
    const cx = (i%3)*cw + cw/2, cy = sy + Math.floor(i/3)*38;
    ctx.save(); ctx.textAlign='center';
    ctx.fillStyle = v>=80?'#4ade80':v>=65?'#facc15':'#f87171';
    ctx.font='900 22px system-ui,sans-serif'; ctx.fillText(String(v), cx, cy);
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='700 12px system-ui,sans-serif';
    ctx.fillText(k, cx, cy+16); ctx.restore();
  });

  return cvs;
}

async function sharePlayerCard(player: Player) {
  try {
    const canvas = await generateCardCanvas(player);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('blob fail')), 'image/png')
    );
    const file = new File([blob], `${player.name}_TAESFC.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${player.name} - TAES FC`, files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${player.name}_TAESFC.png`; a.click();
      URL.revokeObjectURL(url);
    }
  } catch { /* user cancelled or error */ }
}

// ── 이미지 압축 (canvas 리사이즈 후 JPEG 변환) ──
function compressImage(file: File, maxDim = 600, quality = 0.8): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round((height / width) * maxDim); width = maxDim; }
        else { width = Math.round((width / height) * maxDim); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const isPng = file.type === 'image/png';
      resolve(isPng
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality)
      );
    };
    img.src = url;
  });
}

type PosKey = 'GK' | 'DF' | 'MF' | 'FW';
type Player = {
  id: string;
  no: number;
  name: string;
  pos: string;
  positions: PosKey[];
  grade: '3학년';
  honorary: boolean;
  stats: { spd: number; sht: number; pas: number; dri: number; def: number; phy: number };
  photo?: string;
  modelPhoto?: string;
  photoURL?: string | null;
  modelPhotoURL?: string | null;
};

const posColors: Record<string, string> = { GK: '#7C3AED', DF: '#059669', MF: '#2563EB', FW: '#DC2626' };

// ── 카드 테마 ──
const CARD_RED = {
  base: '#060000', mid: '#140000',
  accent: '#dc2626', bright: '#ff5252', glow: '#bb0000',
  border: '#7a0000', borderHi: '#ff4444',
  sepMid: 'rgba(255,200,200,0.75)',
};
const CARD_GOLD = {
  base: '#060200', mid: '#150e00',
  accent: '#c8900a', bright: '#fbbf24', glow: '#a07008',
  border: '#7a5500', borderHi: '#ffe066',
  sepMid: 'rgba(255,240,180,0.80)',
};

function FifaCard({ player, onClick }: { player: Player; onClick: () => void }) {
  const T = CARD_RED;
  const photoSrc = player.photo || player.photoURL || undefined;
  const modelSrc = player.modelPhoto || player.modelPhotoURL || undefined;
  const hasBack = !!modelSrc;
  const ovr = Math.round((player.stats.spd + player.stats.sht + player.stats.pas + player.stats.dri + player.stats.def + player.stats.phy) / 6);
  const stats = [
    { k: 'PAC', v: player.stats.spd }, { k: 'SHO', v: player.stats.sht },
    { k: 'PAS', v: player.stats.pas }, { k: 'DRI', v: player.stats.dri },
    { k: 'DEF', v: player.stats.def }, { k: 'PHY', v: player.stats.phy },
  ];
  const uid = player.id;
  const wrapRef = useRef<HTMLDivElement>(null);
  const holoRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasBack || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * 22;
    const rotX = (y - 0.5) * -18;
    wrapRef.current.style.transition = 'transform 0.05s linear';
    wrapRef.current.style.transform = `perspective(700px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(1.06)`;
    // 홀로그래픽 포일
    if (holoRef.current) {
      const angle = Math.round(Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI));
      holoRef.current.style.opacity = '1';
      holoRef.current.style.backgroundImage = [
        `linear-gradient(${angle}deg,`,
        `rgba(255,50,80,0.13) 0%,`,
        `rgba(255,160,0,0.11) 20%,`,
        `rgba(80,255,120,0.09) 40%,`,
        `rgba(50,160,255,0.11) 60%,`,
        `rgba(180,60,255,0.09) 80%,`,
        `rgba(255,50,120,0.07) 100%)`,
      ].join('');
    }
    // 글레어 스팟
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)`;
    }
  };

  const handleMouseLeave = () => {
    if (!wrapRef.current) return;
    wrapRef.current.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
    wrapRef.current.style.transform = 'none';
    if (holoRef.current) holoRef.current.style.opacity = '0';
    if (glareRef.current) glareRef.current.style.background = 'none';
  };

  const handleClick = () => {
    if (wrapRef.current) {
      const el = wrapRef.current;
      el.animate([
        { transform: el.style.transform || 'none', filter: 'brightness(1)' },
        { transform: (el.style.transform || 'none') + ' scale(1.08)', filter: 'brightness(1.5)' },
        { transform: (el.style.transform || 'none') + ' scale(0.96)', filter: 'brightness(1)' },
        { transform: el.style.transform || 'none', filter: 'brightness(1)' },
      ], { duration: 380, easing: 'cubic-bezier(0.36,0.07,0.19,0.97)' });
    }
    onClick();
  };

  return (
    <div className="relative hover:z-10"
      style={{ minWidth: '150px', perspective: '900px' }}
    >
      <div ref={wrapRef} className="relative cursor-pointer"
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.23,1,0.32,1)' }}
        onMouseEnter={e => { if (hasBack) (e.currentTarget as HTMLDivElement).style.transform = 'rotateY(180deg)'; }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { handleMouseLeave(); if (hasBack && wrapRef.current) { wrapRef.current.style.transition = 'transform 0.5s'; wrapRef.current.style.transform = 'none'; } }}
        onClick={handleClick}
      >
        {/* ══ 앞면 ══ */}
        <div className="relative overflow-hidden"
          style={{
            aspectRatio: '3/4.2',
            borderRadius: '14px',
            background: `linear-gradient(155deg, ${T.mid} 0%, ${T.base} 50%, #000 100%)`,
            backfaceVisibility: 'hidden',
            boxShadow: `0 2px 0 ${T.border}, 0 16px 56px rgba(0,0,0,0.97), 0 0 28px ${T.glow}1a, inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          {/* ── SVG: 카본 파이버 + 센터 글로우 ── */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id={`cf-${uid}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="4" height="4" fill="transparent"/>
                <rect x="0" y="0" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
                <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
                <rect x="0" y="0" width="2" height="0.7" fill="rgba(255,255,255,0.022)"/>
                <rect x="2" y="2" width="2" height="0.7" fill="rgba(255,255,255,0.022)"/>
              </pattern>
              <radialGradient id={`cg-${uid}`} cx="50%" cy="38%" r="52%">
                <stop offset="0%" stopColor={T.glow} stopOpacity="0.16"/>
                <stop offset="100%" stopColor={T.glow} stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill={`url(#cf-${uid})`}/>
            <ellipse cx="50%" cy="38%" rx="58%" ry="48%" fill={`url(#cg-${uid})`}/>
          </svg>

          {/* ── 로고 워터마크 ── */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taes-logo.png" alt="" aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -52%)',
            width: '78%', pointerEvents: 'none',
            opacity: 0.22, filter: 'grayscale(1) brightness(2)',
            zIndex: 2,
          }}/>

          {/* ── 경사 광택 레이어 ── */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '14px',
            background: 'linear-gradient(128deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.025) 28%, transparent 52%)',
          }}/>

          {/* ── 홀로그래픽 포일 (마우스 따라 움직임) ── */}
          <div ref={holoRef} style={{
            position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none', zIndex: 18,
            opacity: 0, transition: 'opacity 0.3s',
            mixBlendMode: 'screen',
          }}/>
          {/* ── 글레어 스팟 ── */}
          <div ref={glareRef} style={{
            position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none', zIndex: 19,
          }}/>

          {/* ── 메탈릭 테두리 (1.5px 단선) ── */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '14px', zIndex: 22, pointerEvents: 'none',
            background: `linear-gradient(145deg, ${T.borderHi} 0%, rgba(255,255,255,0.55) 18%, ${T.accent} 38%, ${T.border} 62%, ${T.borderHi}44 85%, ${T.border} 100%)`,
            padding: '1.5px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          }}/>

          {/* ── 상단 액센트 라인 ── */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 25, pointerEvents: 'none',
            background: `linear-gradient(90deg, transparent, ${T.border} 12%, ${T.accent} 32%, rgba(255,180,180,0.9) 50%, ${T.accent} 68%, ${T.border} 88%, transparent)`,
            borderRadius: '14px 14px 0 0',
          }}/>

          {/* ── 하단 글로우 ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', pointerEvents: 'none',
            background: `radial-gradient(ellipse 75% 38% at 50% 100%, ${T.glow}30, transparent 70%)`,
          }}/>

          {/* ── OVR + 포지션 ── */}
          <div style={{ position: 'absolute', top: 10, left: 11, zIndex: 15 }}>
            <div style={{
              fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1,
              textShadow: `0 0 14px ${T.glow}, 0 2px 8px rgba(0,0,0,0.9)`,
            }}>{ovr}</div>
            <div style={{
              fontSize: 10, fontWeight: 900, color: T.bright, letterSpacing: '0.07em', marginTop: 2,
              textShadow: `0 0 8px ${T.glow}`,
            }}>{(player.positions ?? [player.pos]).join('·')}</div>
            {player.honorary && (
              <div style={{
                marginTop: 5, fontSize: 6.5, fontWeight: 900, letterSpacing: '0.07em',
                color: '#fbbf24', border: '1px solid #fbbf2466',
                padding: '1.5px 4px', borderRadius: 2,
                textShadow: '0 0 6px #d4a01780',
              }}>★ 명예회원</div>
            )}
          </div>

          {/* ── TAES FC ── */}
          <div style={{ position: 'absolute', top: 10, right: 10, textAlign: 'right', zIndex: 15 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: T.bright, letterSpacing: '0.12em', opacity: 0.85 }}>TAES</div>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', marginTop: 1 }}>FC</div>
          </div>

          {/* ── 선수 사진 ── */}
          <div style={{
            position: 'absolute', bottom: '21%', left: '50%',
            transform: 'translateX(-50%)',
            width: '92%', height: '62%',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 10,
          }}>
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc} alt={player.name} style={{
                maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                filter: `drop-shadow(0 4px 18px rgba(0,0,0,0.95)) drop-shadow(0 0 10px ${T.glow}30)`,
              }}/>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: T.accent, opacity: 0.4,
                  textShadow: `0 0 24px ${T.glow}` }}>#{player.no}</div>
                <div style={{ fontSize: 20, opacity: 0.15, marginTop: 4 }}>⚽</div>
              </div>
            )}
          </div>

          {/* ── 하단 정보 패널 ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
            background: `linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.85) 55%, transparent 100%)`,
            padding: '28px 10px 10px',
            borderRadius: '0 0 14px 14px',
          }}>
            <div style={{
              height: 1, marginBottom: 7,
              background: `linear-gradient(to right, transparent, ${T.border} 10%, ${T.bright} 32%, ${T.sepMid} 50%, ${T.bright} 68%, ${T.border} 90%, transparent)`,
              boxShadow: `0 0 5px ${T.glow}45`,
            }}/>
            <div style={{ textAlign: 'center', marginBottom: 7 }}>
              <div style={{
                fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '0.05em',
                textShadow: `0 0 12px ${T.glow}55, 0 1px 4px rgba(0,0,0,0.9)`,
              }}>{player.name}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                marginTop: 3, padding: '2px 8px', borderRadius: 20,
                background: `${T.glow}12`, border: `1px solid ${T.accent}38`,
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>No.</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', textShadow: `0 0 8px ${T.glow}` }}>{player.no}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px 2px' }}>
              {stats.map(({ k, v }) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 900, lineHeight: 1,
                    color: v >= 80 ? '#4ade80' : v >= 65 ? '#facc15' : '#f87171',
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  }}>{v}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', marginTop: 1 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ 뒷면 (로고) ══ */}
        {hasBack && (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={{
              borderRadius: '14px',
              background: `linear-gradient(155deg, ${T.mid} 0%, ${T.base} 50%, #000 100%)`,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: `0 2px 0 ${T.border}, 0 16px 56px rgba(0,0,0,0.97)`,
            }}
          >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <rect width="100%" height="100%" fill={`url(#cf-${uid})`}/>
            </svg>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none',
              background: `linear-gradient(145deg, ${T.borderHi} 0%, rgba(255,255,255,0.55) 18%, ${T.accent} 38%, ${T.border} 62%, ${T.borderHi}44 85%, ${T.border} 100%)`,
              padding: '1.5px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor', maskComposite: 'exclude',
            }}/>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '14px',
              background: 'linear-gradient(128deg, rgba(255,255,255,0.08) 0%, transparent 40%)',
            }}/>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/taes-logo.png" alt="" aria-hidden style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70%', pointerEvents: 'none',
              opacity: 0.22, filter: 'grayscale(1) brightness(2)',
              zIndex: 2,
            }}/>
            <div className="text-[9px] font-black tracking-widest mb-2 z-10" style={{ color: T.bright }}>TAES FC PREMIER</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modelSrc} alt="logo" className="z-10" style={{ width: '80%', objectFit: 'contain', filter: `drop-shadow(0 0 14px ${T.glow}50)` }}/>
            <div className="mt-2 text-center z-10">
              <div className="text-white font-black text-sm">{player.name}</div>
              <div className="text-[11px] font-bold mt-0.5" style={{ color: T.accent }}>No.{player.no} · {(player.positions ?? [player.pos]).join('·')}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── 공유 버튼 ── */}
      <button
        onClick={async e => {
          e.stopPropagation();
          setSharing(true);
          await sharePlayerCard(player);
          setSharing(false);
        }}
        disabled={sharing}
        style={{
          marginTop: 8, width: '100%', padding: '7px 0',
          background: sharing ? 'rgba(255,255,255,0.05)' : 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 8, color: sharing ? 'rgba(255,255,255,0.3)' : '#ff5252',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
          cursor: sharing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
        onMouseEnter={e => { if (!sharing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.28)'; }}
        onMouseLeave={e => { if (!sharing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.15)'; }}
      >
        {sharing ? (
          <><span style={{ display:'inline-block', animation:'spin 0.8s linear infinite' }}>⟳</span> 생성 중...</>
        ) : (
          <><span>📤</span> 카드 공유</>
        )}
      </button>
    </div>
  );
}

// ── 폼 타입 ──
const ALL_POS: PosKey[] = ['GK', 'DF', 'MF', 'FW'];
const emptyForm = {
  no: '', name: '',
  positions: ['FW'] as PosKey[],
  grade: '3학년' as Player['grade'],
  honorary: false,
  spd: '', sht: '', pas: '', dri: '', def: '', phy: '',
  photo: '',
  modelPhoto: '',
  photoCleared: false,
  modelPhotoCleared: false,
};
type FormState = typeof emptyForm;

function playerToForm(p: Player): FormState {
  return {
    no: String(p.no), name: p.name,
    positions: (p.positions?.length ? p.positions : [p.pos as PosKey]),
    grade: p.grade,
    honorary: p.honorary ?? false,
    spd: String(p.stats?.spd ?? 0), sht: String(p.stats?.sht ?? 0), pas: String(p.stats?.pas ?? 0),
    dri: String(p.stats?.dri ?? 0), def: String(p.stats?.def ?? 0), phy: String(p.stats?.phy ?? 0),
    photo: p.photo || p.photoURL || '',
    modelPhoto: p.modelPhoto || p.modelPhotoURL || '',
    photoCleared: false,
    modelPhotoCleared: false,
  };
}


const iCls = "w-full px-3 py-2 bg-[#0e0e0e] border border-white/10 text-white text-sm focus:border-red-700 outline-none";
const sCls = "w-full px-3 py-2 bg-[#0e0e0e] border border-white/10 text-white text-sm focus:border-red-700 outline-none";
const lCls = "block text-white/40 text-[11px] font-bold mb-1 uppercase tracking-wider";

// ── 스켈레톤 카드 ──
function SkeletonCard() {
  return (
    <div className="relative p-3 overflow-hidden animate-pulse"
      style={{ background: '#111111', border: '2px solid rgba(255,255,255,0.06)', borderRadius: '8px', minWidth: '155px' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-5 rounded" style={{ backgroundColor: '#2a2a2a' }} />
        <div className="w-12 h-4 rounded" style={{ backgroundColor: '#2a2a2a' }} />
      </div>
      <div className="flex justify-center my-2">
        <div className="w-20 h-20 rounded-full" style={{ backgroundColor: '#2a2a2a' }} />
      </div>
      <div className="text-center mb-3">
        <div className="w-20 h-4 rounded mx-auto mb-1" style={{ backgroundColor: '#2a2a2a' }} />
        <div className="w-16 h-3 rounded mx-auto" style={{ backgroundColor: '#2a2a2a' }} />
      </div>
      <div className="h-px mb-3" style={{ backgroundColor: '#2a2a2a' }} />
      <div className="space-y-2">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-2 rounded" style={{ backgroundColor: '#2a2a2a' }} />
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }} />
            <div className="w-5 h-2 rounded" style={{ backgroundColor: '#2a2a2a' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersContent() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeGrade, setActiveGrade] = useState<'전체' | '3학년'>('전체');
  const [search, setSearch] = useState('');
  const [activePos, setActivePos] = useState('전체');
  const [selected, setSelected] = useState<Player | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const q = query(collection(db, 'players'), orderBy('no'));
        const snapshot = await getDocs(q);
        const loaded: Player[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            no: data.no,
            name: data.name,
            pos: data.pos,
            positions: data.positions ?? [data.pos],
            grade: data.grade,
            honorary: data.honorary ?? false,
            stats: data.stats ?? { spd: 0, sht: 0, pas: 0, dri: 0, def: 0, phy: 0 },
            photoURL: data.photoURL ?? null,
            modelPhotoURL: data.modelPhotoURL ?? null,
            photo: data.photoURL ?? undefined,
            modelPhoto: data.modelPhotoURL ?? undefined,
          } as Player;
        });
        setPlayers(loaded);
      } catch (err) {
        console.error('Failed to load players:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlayers();
  }, []);

  const sf = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 400, 0.85);
    setForm(f => ({ ...f, photo: compressed }));
  };

  const handleModelPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 500, 0.85);
    setForm(f => ({ ...f, modelPhoto: compressed }));
  };

  const openEdit = (p: Player) => requireAdmin(() => { setForm(playerToForm(p)); setEditMode(true); setAddMode(false); });
  const openAdd  = () => requireAdmin(() => { setForm(emptyForm); setAddMode(true); setEditMode(false); setSelected(null); });
  const closeModal = () => { setSelected(null); setEditMode(false); setAddMode(false); setDeleteTarget(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const positions = form.positions.length ? form.positions : ['FW' as PosKey];
      const playerId = editMode && selected ? selected.id : String(Date.now());

      // Store base64 dataURL directly in Firestore
      let photoURL: string | null = null;
      let modelPhotoURL: string | null = null;

      // Handle photo: if user cleared it, set to null. Otherwise use new value or keep old one.
      if (form.photoCleared) {
        photoURL = null;
      } else if (form.photo) {
        photoURL = form.photo; // base64 dataURL or existing value
      } else if (editMode && selected) {
        photoURL = selected.photoURL ?? null;
      }

      // Handle model photo: if user cleared it, set to null. Otherwise use new value or keep old one.
      if (form.modelPhotoCleared) {
        modelPhotoURL = null;
      } else if (form.modelPhoto) {
        modelPhotoURL = form.modelPhoto; // base64 dataURL or existing value
      } else if (editMode && selected) {
        modelPhotoURL = selected.modelPhotoURL ?? null;
      }

      const playerData = {
        no: Number(form.no),
        name: form.name,
        pos: positions[0],
        positions,
        grade: form.grade,
        honorary: form.honorary,
        stats: {
          spd: Number(form.spd), sht: Number(form.sht), pas: Number(form.pas),
          dri: Number(form.dri), def: Number(form.def), phy: Number(form.phy),
        },
        photoURL: photoURL ?? null,
        modelPhotoURL: modelPhotoURL ?? null,
      };

      await setDoc(doc(db, 'players', playerId), playerData);

      // Firestore에서 실제 저장된 값을 다시 읽어와서 표시
      const savedDoc = await getDoc(doc(db, 'players', playerId));
      const savedData = savedDoc.data()!;
      const updatedPlayer: Player = {
        id: playerId,
        no: savedData.no,
        name: savedData.name,
        pos: savedData.pos,
        positions: savedData.positions ?? [savedData.pos],
        grade: savedData.grade,
        honorary: savedData.honorary ?? false,
        stats: savedData.stats ?? { spd: 0, sht: 0, pas: 0, dri: 0, def: 0, phy: 0 },
        photoURL: savedData.photoURL ?? null,
        modelPhotoURL: savedData.modelPhotoURL ?? null,
        photo: savedData.photoURL ?? undefined,
        modelPhoto: savedData.modelPhotoURL ?? undefined,
      };

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      if (editMode && selected) {
        setPlayers(prev => prev.map(p => p.id === selected.id ? updatedPlayer : p));
        setEditMode(false);
        setAddMode(false);
        setSelected(updatedPlayer);
      } else {
        setPlayers(prev => [...prev, updatedPlayer]);
        closeModal();
      }
    } catch (err: unknown) {
      console.error('Save failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError('저장 실패: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'players', deleteTarget.id));
      setPlayers(prev => prev.filter(p => p.id !== deleteTarget.id));
      closeModal();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = players.filter(p => {
    const mg = activeGrade === '전체' || p.grade === activeGrade;
    const mp = activePos === '전체' || (p.positions ?? [p.pos]).includes(activePos as PosKey);
    return mg && mp && p.name.includes(search);
  });

  const showForm = editMode || addMode;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #050505 0%, #1a0000 100%)' }}>
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>PLAYERS</div>
            <h1 className="text-4xl font-black text-white mb-2">등록 선수</h1>
            <p className="text-white/40 text-sm">카드를 클릭하면 수정·삭제할 수 있습니다 ⚽</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 font-bold text-white text-sm hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#CC0000' }}>
            + 선수 등록
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center flex-wrap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">🔍</span>
            <input type="text" placeholder="선수 이름 검색" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm text-white outline-none w-48"
              style={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }} />
          </div>
          <div className="flex items-center px-4 py-2 text-sm font-black" style={{ backgroundColor: '#CC0000', color: '#fff' }}>
            전체 ({players.length})
          </div>
          <div className="flex gap-1 ml-auto">
            {(['전체', 'GK', 'DF', 'MF', 'FW'] as const).map(pos => (
              <button key={pos} onClick={() => setActivePos(pos)}
                className="px-3 py-2 text-xs font-black transition-colors"
                style={{
                  backgroundColor: activePos === pos ? (posColors[pos] ?? '#CC0000') : '#0e0e0e',
                  color: activePos === pos ? '#fff' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${activePos === pos ? (posColors[pos] ?? '#CC0000') : 'rgba(255,255,255,0.1)'}`,
                }}>
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* 카드 목록 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-white/25 border border-white/5" style={{ backgroundColor: '#080808' }}>
            <div className="text-6xl mb-4">⚽</div>
            <div className="text-lg font-bold mb-2">등록된 선수가 없습니다</div>
            <div className="text-sm text-white/20">상단의 <span className="text-red-500 font-bold">+ 선수 등록</span> 버튼을 눌러 선수를 추가하세요</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(p => (
              <FifaCard key={p.id} player={p} onClick={() => { setSelected(p); setEditMode(false); }} />
            ))}
          </div>
        )}
      </div>

      {/* ── 상세 / 수정 모달 ── */}
      {(selected || addMode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-xl border border-white/10 overflow-y-auto max-h-[92vh]" style={{ backgroundColor: '#080808' }}>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-black text-white text-lg">
                {addMode ? '선수 등록' : showForm ? '선수 수정' : selected?.name}
              </h2>
              <div className="flex items-center gap-2">
                {selected && !showForm && (
                  <>
                    <button onClick={() => openEdit(selected)}
                      className="px-4 py-1.5 text-xs font-bold text-white border border-white/20 hover:border-white/50 transition-colors">
                      수정
                    </button>
                    <button onClick={() => requireAdmin(() => setDeleteTarget(selected))}
                      className="px-4 py-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#dc2626' }}>
                      삭제
                    </button>
                  </>
                )}
                <button onClick={closeModal} className="text-white/40 hover:text-white text-2xl leading-none ml-2">×</button>
              </div>
            </div>

            {/* 상세 보기 */}
            {selected && !showForm && (
              <div className="p-6 flex gap-6 flex-wrap">
                <div className="flex-shrink-0">
                  <FifaCard player={selected} onClick={() => {}} />
                </div>
                <div className="flex-1 min-w-[180px] flex flex-col justify-between">
                  <div className="space-y-3 pt-1">
                    {[
                      ['등번호', `#${selected.no}`],
                      ['학년', selected.grade],
                      ['포지션', (selected.positions ?? [selected.pos]).join(' · ')],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/40 text-sm">{k}</span>
                        <span className="text-white font-bold text-sm">{v}</span>
                      </div>
                    ))}
                  </div>
                  {(selected.modelPhoto || selected.modelPhotoURL) && (
                    <div className="flex justify-center mt-6" style={{ backgroundColor: 'transparent' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.modelPhoto || selected.modelPhotoURL!}
                        alt="3D 유니폼"
                        style={{ width: 240, height: 240, objectFit: 'contain', backgroundColor: 'transparent' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 등록 / 수정 폼 */}
            {showForm && (
              <form onSubmit={handleSave} className="p-6 space-y-5">

                {/* 사진 업로드 */}
                <div>
                  <label className={lCls}>선수 사진</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.15)', backgroundColor: '#0e0e0e', cursor: 'pointer' }}
                      onClick={() => fileRef.current?.click()}
                    >
                      {form.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-[10px] text-white/30">클릭</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="px-4 py-2 text-xs font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors block w-full">
                        📷 사진 선택
                      </button>
                      {form.photo && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, photo: '', photoCleared: true }))}
                          className="text-xs text-red-500/70 hover:text-red-400 transition-colors block">
                          사진 제거
                        </button>
                      )}
                      <p className="text-[11px] text-white/20">JPG, PNG 권장</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                </div>

                {/* 로고 사진 */}
                <div>
                  <label className={lCls}>로고 사진</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed rgba(255,255,255,0.15)', backgroundColor: 'transparent', cursor: 'pointer',
                        backgroundImage: 'linear-gradient(45deg,#1a1a1a 25%,transparent 25%,transparent 75%,#1a1a1a 75%),linear-gradient(45deg,#1a1a1a 25%,transparent 25%,transparent 75%,#1a1a1a 75%)',
                        backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}
                      onClick={() => modelFileRef.current?.click()}
                    >
                      {form.modelPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.modelPhoto} alt="3d preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'transparent' }} />
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">👕</div>
                          <div className="text-[10px] text-white/30">클릭</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={() => modelFileRef.current?.click()}
                        className="px-4 py-2 text-xs font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors block w-full">
                        🖼 로고 사진 선택
                      </button>
                      {form.modelPhoto && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, modelPhoto: '', modelPhotoCleared: true }))}
                          className="text-xs text-red-500/70 hover:text-red-400 transition-colors block">
                          사진 제거
                        </button>
                      )}
                      <p className="text-[11px] text-white/20">PNG 권장 (배경 투명)</p>
                    </div>
                    <input ref={modelFileRef} type="file" accept="image/*" className="hidden" onChange={handleModelPhotoChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lCls}>이름 *</label><input required className={iCls} value={form.name} onChange={sf('name')} placeholder="홍길동" /></div>
                  <div><label className={lCls}>등번호 *</label><input required type="number" min="1" max="99" className={iCls} value={form.no} onChange={sf('no')} placeholder="10" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lCls}>학년 *</label>
                    <select required className={sCls} value={form.grade} onChange={sf('grade')}>
                      <option value="3학년">3학년</option>
                    </select>
                  </div>
                  <div>
                    <label className={lCls}>포지션 * <span className="text-white/25 font-normal normal-case">(복수 선택 가능)</span></label>
                    <div className="flex gap-2 mt-1">
                      {ALL_POS.map(p => {
                        const sel = form.positions.includes(p);
                        return (
                          <button
                            key={p} type="button"
                            onClick={() => {
                              setForm(f => {
                                const next = f.positions.includes(p)
                                  ? f.positions.filter(x => x !== p)
                                  : [...f.positions, p];
                                return { ...f, positions: next.length ? next : [p] };
                              });
                            }}
                            className="flex-1 py-2 text-xs font-black transition-all"
                            style={{
                              backgroundColor: sel ? posColors[p] : '#0e0e0e',
                              color: sel ? '#fff' : 'rgba(255,255,255,0.35)',
                              border: `1px solid ${sel ? posColors[p] : 'rgba(255,255,255,0.1)'}`,
                              boxShadow: sel ? `0 0 8px ${posColors[p]}60` : 'none',
                            }}
                          >{p}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 명예회원 */}
                <label
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                  style={{
                    backgroundColor: form.honorary ? 'rgba(251,191,36,0.08)' : '#0a0a0a',
                    border: `1px solid ${form.honorary ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 4,
                  }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      backgroundColor: form.honorary ? '#f59e0b' : 'transparent',
                      border: `2px solid ${form.honorary ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                      boxShadow: form.honorary ? '0 0 10px #f59e0b60' : 'none',
                    }}
                    onClick={() => setForm(f => ({ ...f, honorary: !f.honorary }))}
                  >
                    {form.honorary && <span style={{ color: '#000', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                  <input type="checkbox" checked={form.honorary}
                    onChange={e => setForm(f => ({ ...f, honorary: e.target.checked }))}
                    className="hidden" />
                  <div>
                    <div className="font-bold text-sm" style={{ color: form.honorary ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
                      ★ 명예회원
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      체크 시 카드가 골드 테마로 변경됩니다
                    </div>
                  </div>
                </label>

                {/* 능력치 */}
                <div className="border border-white/10 p-4" style={{ backgroundColor: '#080808' }}>
                  <p className={lCls + ' mb-3'}>능력치 (0–99)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['spd', 'sht', 'pas', 'dri', 'def', 'phy'] as const).map(k => (
                      <div key={k}>
                        <label className={lCls}>{k.toUpperCase()}</label>
                        <input type="number" min="0" max="99" className={iCls} value={form[k]} onChange={sf(k)} placeholder="70" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setEditMode(false); setAddMode(false); }}
                    className="flex-1 py-3 font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors text-sm">
                    취소
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 font-bold text-white hover:opacity-80 transition-opacity text-sm disabled:opacity-50"
                    style={{ backgroundColor: '#CC0000' }}>
                    {saving ? '저장 중...' : addMode ? '등록 완료' : '수정 완료'}
                  </button>
                </div>
                {saveError && (
                  <div className="mt-3 px-3 py-2.5 rounded-sm text-xs text-red-400 break-all"
                    style={{ background: 'rgba(204,0,0,0.12)', border: '1px solid rgba(204,0,0,0.3)' }}>
                    ⚠ {saveError}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 삭제 확인 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
          <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#080808' }}>
            <h3 className="text-white font-black text-lg mb-1">선수 삭제</h3>
            <p className="text-white/50 text-sm mb-6">
              <span className="text-white font-bold">{deleteTarget.name}</span> 선수를 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors text-sm">
                취소
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-2.5 font-bold text-white hover:opacity-80 transition-opacity text-sm disabled:opacity-50"
                style={{ backgroundColor: '#dc2626' }}>
                {saving ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
      {adminModal}

      {/* ── 저장 성공 토스트 ── */}
      {saveSuccess && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, backgroundColor: '#16a34a', color: '#fff',
          padding: '12px 24px', borderRadius: 8, fontWeight: 800, fontSize: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideUp 0.3s ease',
        }}>
          ✓ 저장되었습니다
        </div>
      )}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-white/30">로딩 중...</div>}>
      <PlayersContent />
    </Suspense>
  );
}
