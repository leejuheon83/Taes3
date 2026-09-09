'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import NextImage from 'next/image';
import { useAdminAuth } from '@/components/AdminAuth';
import SearchPlayerCard from '@/components/SearchPlayerCard';
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

// ── 카드 → Canvas 생성 (화면의 프레임 카드와 같은 배치) ──
function cssFont(varName: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

async function generateCardCanvas(player: Player): Promise<HTMLCanvasElement> {
  const W = 760, H = 1013;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d')!;
  const numFont = cssFont('--font-num', 'sans-serif');
  const nameFont = cssFont('--font-display', 'sans-serif');
  try { await document.fonts.ready; } catch { /* ignore */ }

  // 선수 사진: 프레임 가운데 창 (left 13%, top 16.5%, w 74%, h 47.5%) — 화면과 동일
  const photoSrc = player.photo || player.photoURL;
  const win = { x: W * 0.13, y: H * 0.165, w: W * 0.74, h: H * 0.475 };
  if (photoSrc) {
    try {
      const ph = await loadImg(photoSrc);
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const t = tmp.getContext('2d')!;
      // object-fit: cover, object-position 50% 40%
      const sc = Math.max(win.w / ph.width, win.h / ph.height);
      const dw = ph.width * sc, dh = ph.height * sc;
      const dx = win.x + (win.w - dw) * 0.5, dy = win.y + (win.h - dh) * 0.4;
      t.save(); t.beginPath(); t.rect(win.x, win.y, win.w, win.h); t.clip();
      t.drawImage(ph, dx, dy, dw, dh); t.restore();
      // 가장자리를 부드럽게 (radial mask)
      const cx = win.x + win.w * 0.5, cy = win.y + win.h * 0.47;
      const rx = win.w * 0.8, ry = win.h * 0.86;
      t.globalCompositeOperation = 'destination-in';
      t.save(); t.translate(cx, cy); t.scale(1, ry / rx);
      const m = t.createRadialGradient(0, 0, 0, 0, 0, rx);
      m.addColorStop(0.74, 'rgba(0,0,0,1)'); m.addColorStop(0.9, 'rgba(0,0,0,0.6)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      t.fillStyle = m; t.fillRect(-W, -H * 2, W * 2, H * 4); t.restore();
      ctx.drawImage(tmp, 0, 0);
    } catch { /* ignore */ }
  } else {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,74,42,0.35)'; ctx.font = `800 ${W * 0.22}px ${numFont}`;
    ctx.fillText(`#${player.no}`, W / 2, H * 0.4); ctx.restore();
  }

  // 프레임
  try { ctx.drawImage(await loadImg('/card-frame.webp'), 0, 0, W, H); } catch { /* ignore */ }

  const chrome = (y0: number, y1: number) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.36, '#dfe3e9'); g.addColorStop(1, '#868b95');
    return g;
  };

  // OVR + 포지션
  const ovr = Math.round((player.stats.spd+player.stats.sht+player.stats.pas+player.stats.dri+player.stats.def+player.stats.phy)/6);
  ctx.save(); ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.font = `800 ${W * 0.17}px ${numFont}`; ctx.fillStyle = chrome(H * 0.075, H * 0.075 + W * 0.14);
  ctx.fillText(String(ovr), W * 0.095, H * 0.075);
  ctx.font = `800 ${W * 0.06}px ${numFont}`; ctx.fillStyle = '#ff5a40';
  ctx.shadowColor = 'rgba(255,36,23,0.6)'; ctx.shadowBlur = 12;
  const pos = (player.positions?.length ? player.positions : [player.pos]).join('·');
  ctx.fillText(pos, W * 0.095, H * 0.075 + W * 0.145);
  if (player.honorary) {
    ctx.shadowBlur = 0; ctx.font = `900 ${W * 0.032}px ${nameFont}`;
    const y = H * 0.075 + W * 0.215;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.strokeStyle = 'rgba(251,191,36,0.4)';
    ctx.beginPath(); ctx.roundRect(W * 0.095, y, W * 0.2, W * 0.045, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.fillText('★ 명예회원', W * 0.11, y + W * 0.007);
  }
  ctx.restore();

  // 이름 (받침 없이 그림자만)
  const nameSize = W * (player.name.length > 4 ? 0.096 : 0.116);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `400 ${nameSize}px ${nameFont}`;
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#000'; ctx.fillText(player.name, W / 2, H * 0.49);
  ctx.shadowColor = 'rgba(255,60,35,0.4)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 0;
  ctx.fillStyle = chrome(H * 0.49, H * 0.49 + nameSize); ctx.fillText(player.name, W / 2, H * 0.49);
  ctx.restore();
  // 이름 밑선
  const uy = H * 0.49 + nameSize * 1.16;
  const ug = ctx.createLinearGradient(W * 0.26, 0, W * 0.74, 0);
  ug.addColorStop(0, 'rgba(255,74,42,0)'); ug.addColorStop(0.22, '#ff4a2a'); ug.addColorStop(0.5, '#fff0ea');
  ug.addColorStop(0.78, '#ff4a2a'); ug.addColorStop(1, 'rgba(255,74,42,0)');
  ctx.save(); ctx.shadowColor = 'rgba(255,60,35,0.85)'; ctx.shadowBlur = 8;
  ctx.fillStyle = ug; ctx.fillRect(W * 0.26, uy, W * 0.48, W * 0.005); ctx.restore();

  // 등번호 판 (육각 금속 테두리)
  ctx.save();
  ctx.font = `800 ${W * 0.064}px ${numFont}`;
  const numW = ctx.measureText(String(player.no)).width;
  ctx.font = `700 ${W * 0.039}px ${numFont}`;
  const labW = ctx.measureText('No.').width;
  const pw = numW + labW + W * 0.15 + W * 0.06, phh = W * 0.064 * 1.15 + W * 0.014;
  const px = W / 2 - pw / 2, py = H * 0.575;
  const plate = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.06, y); ctx.lineTo(x + w * 0.94, y); ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w * 0.94, y + h); ctx.lineTo(x + w * 0.06, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath();
  };
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  const og = ctx.createLinearGradient(0, py, 0, py + phh);
  og.addColorStop(0, '#ffd9d1'); og.addColorStop(0.26, '#ff6e52'); og.addColorStop(0.62, '#8e1105'); og.addColorStop(1, '#ffb3a2');
  ctx.fillStyle = og; plate(px, py, pw, phh); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const ig = ctx.createLinearGradient(0, py, 0, py + phh);
  ig.addColorStop(0, 'rgba(255,120,95,0.22)'); ig.addColorStop(0.42, 'rgba(10,4,5,0.96)'); ig.addColorStop(1, 'rgba(4,2,3,0.98)');
  const b = W * 0.0042;
  ctx.fillStyle = ig; plate(px + b, py + b, pw - b * 2, phh - b * 2); ctx.fill();
  // 다이아몬드 + 글자
  const dy = py + phh / 2, d = W * 0.0075;
  const dg = ctx.createLinearGradient(0, dy - d, 0, dy + d);
  dg.addColorStop(0, '#fff2ee'); dg.addColorStop(1, '#ff5a3c');
  ctx.shadowColor = 'rgba(255,80,55,0.9)'; ctx.shadowBlur = 5;
  for (const xx of [px + W * 0.075 + d, px + pw - W * 0.075 - d]) {
    ctx.save(); ctx.translate(xx, dy); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = dg; ctx.fillRect(-d, -d, d * 2, d * 2); ctx.restore();
  }
  ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
  const baseY = py + phh * 0.5 + W * 0.064 * 0.36;
  let tx = W / 2 - (labW + W * 0.012 + numW) / 2;
  ctx.font = `700 ${W * 0.039}px ${numFont}`; ctx.fillStyle = '#cfd4da'; ctx.fillText('No.', tx, baseY);
  tx += labW + W * 0.012;
  ctx.font = `800 ${W * 0.064}px ${numFont}`; ctx.fillStyle = chrome(baseY - W * 0.064, baseY); ctx.fillText(String(player.no), tx, baseY);
  ctx.restore();

  // 능력치 (프레임 빈 칸 좌표)
  const statsArr = [
    {k:'PAC',v:player.stats.spd},{k:'SHO',v:player.stats.sht},{k:'PAS',v:player.stats.pas},
    {k:'DRI',v:player.stats.dri},{k:'DEF',v:player.stats.def},{k:'PHY',v:player.stats.phy},
  ];
  statsArr.forEach(({k,v},i) => {
    const [sx, sy] = STAT_SLOTS[i];
    const cx = W * (sx + 24.8 / 2) / 100, cy = H * (sy + 9.4 / 2) / 100;
    ctx.save(); ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `800 ${W * 0.084}px ${numFont}`; ctx.fillStyle = chrome(cy - W * 0.07, cy + W * 0.005);
    ctx.fillText(String(v), cx, cy + W * 0.008);
    ctx.font = `700 ${W * 0.03}px ${numFont}`; ctx.fillStyle = '#9aa0a8';
    ctx.fillText(k, cx, cy + W * 0.008 + W * 0.036);
    ctx.restore();
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

// 프레임 그림에서 측정한 능력치 칸 좌표 (카드 대비 %)
const STAT_SLOTS: [number, number][] = [
  [10.3, 64.0], [37.7, 64.0], [65.0, 64.0],
  [10.3, 75.8], [37.7, 75.8], [65.0, 75.8],
];

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
  // 카드마다 불빛 시작 위치를 어긋나게 (id 기반, 서버/클라이언트 동일)
  const beamDelay = (String(player.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4) + 1;
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
        {/* ══ 앞면: 프레임 그림 위에 사진·이름·등번호·능력치를 얹는다 ══ */}
        <div className="fcard" style={{ backfaceVisibility: 'hidden' }}>
          {/* 선수 사진 (프레임 가운데 창) */}
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="fcard__shot" src={photoSrc} alt={player.name} draggable={false} />
          ) : (
            <div className="fcard__noshot">#{player.no}</div>
          )}

          {/* 프레임 */}
          <NextImage className="fcard__frame" src="/card-frame.webp" alt="" aria-hidden fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 220px" draggable={false} />

          {/* OVR + 포지션 */}
          <div className="fcard__ovr">
            <span className="fcard__ovr-n">{ovr}</span>
            <span className="fcard__ovr-pos">{(player.positions?.length ? player.positions : [player.pos]).join('·')}</span>
            {player.honorary && <span className="fcard__hon">★ 명예회원</span>}
          </div>

          {/* 이름 */}
          <h3 className={`fcard__name${player.name.length > 4 ? ' is-long' : ''}`}>{player.name}</h3>

          {/* 등번호 판 */}
          <div className="fcard__num">
            <div className="fcard__num-in">
              <i className="fcard__num-d" aria-hidden />
              <span className="fcard__num-lab">No.</span>
              <b className="fcard__num-n">{player.no}</b>
              <i className="fcard__num-d" aria-hidden />
            </div>
          </div>

          {/* 능력치: 프레임의 빈 칸 6개 */}
          {stats.map(({ k, v }, i) => (
            <div key={k} className="fcard__stat" style={{ left: `${STAT_SLOTS[i][0]}%`, top: `${STAT_SLOTS[i][1]}%` }}>
              <span className="fcard__stat-v">{v}</span>
              <span className="fcard__stat-k">{k}</span>
            </div>
          ))}

          {/* 프레임을 따라 흐르는 빛 */}
          <div className={`fcard__shine d${beamDelay}`} aria-hidden />

          {/* 홀로그래픽 포일 / 글레어 (마우스 따라 움직임) */}
          <div ref={holoRef} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
            opacity: 0, transition: 'opacity 0.3s', mixBlendMode: 'screen',
            WebkitMask: 'var(--fc-frame) center / 100% 100% no-repeat',
            mask: 'var(--fc-frame) center / 100% 100% no-repeat',
          }}/>
          <div ref={glareRef} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
            WebkitMask: 'var(--fc-frame) center / 100% 100% no-repeat',
            mask: 'var(--fc-frame) center / 100% 100% no-repeat',
          }}/>
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
            <img src="/taes-emblem.png" alt="" aria-hidden style={{
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
            <div className="section-eyebrow mb-2">PLAYERS</div>
            <h1 className="text-4xl section-title mb-2">등록 선수</h1>
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
            <SearchPlayerCard />
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
              <h2 className="section-title text-lg">
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
                <div className="flex-shrink-0 w-[240px] max-w-full">
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
