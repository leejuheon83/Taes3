'use client';

import Image from 'next/image';

// 불씨 파티클 위치/방향 (CSS 변수 --ex, --ey)
const EMBERS = [
  { x: '-60px', y: '-80px', delay: '0.05s', size: 5 },
  { x: '70px',  y: '-90px', delay: '0.1s',  size: 4 },
  { x: '-90px', y: '-50px', delay: '0.15s', size: 3 },
  { x: '100px', y: '-55px', delay: '0.2s',  size: 5 },
  { x: '-40px', y: '-100px',delay: '0.08s', size: 3 },
  { x: '50px',  y: '-110px',delay: '0.12s', size: 4 },
  { x: '-110px',y: '-30px', delay: '0.18s', size: 3 },
  { x: '110px', y: '-35px', delay: '0.22s', size: 4 },
  { x: '20px',  y: '-120px',delay: '0.06s', size: 3 },
  { x: '-20px', y: '-115px',delay: '0.14s', size: 5 },
];

export default function HeroAnimation() {
  return (
    <div className="flex-shrink-0 relative" style={{ width: 300, height: 300 }}>

      {/* ── 잔광 (인트로 후 부드럽게 숨쉬는 red glow) ── */}
      <div
        className="absolute after-glow pointer-events-none rounded-full"
        style={{
          inset: '-40px',
          background: 'radial-gradient(circle, rgba(204,0,0,0.3) 0%, rgba(180,30,0,0.15) 45%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* ── 번개 섬광 배경 (번쩍일 때 배경 하얗게) ── */}
      <div
        className="absolute pointer-events-none rounded-full lightning-screen"
        style={{
          inset: '-60px',
          background: 'radial-gradient(circle, rgba(255,220,180,0.85) 0%, rgba(255,80,0,0.4) 35%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />

      {/* ── 번개 glow (번쩍일 때 주변 글로우) ── */}
      <div
        className="absolute inset-0 lightning-glow pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,180,80,0.5) 0%, rgba(204,60,0,0.3) 50%, transparent 75%)',
          filter: 'blur(10px)',
        }}
      />

      {/* ── 불꽃 기둥들 (인트로 때 한 번) ── */}
      {/* 왼쪽 큰 불꽃 */}
      <div className="flame-t1 absolute pointer-events-none" style={{
        left: '25%', bottom: '10%',
        width: 30, height: 90,
        background: 'linear-gradient(to top, #ff6a00, #ff4500, #cc0000, transparent)',
        borderRadius: '50% 50% 20% 20%',
        filter: 'blur(4px)',
        opacity: 0,
      }} />
      {/* 오른쪽 큰 불꽃 */}
      <div className="flame-t2 absolute pointer-events-none" style={{
        right: '22%', bottom: '12%',
        width: 35, height: 100,
        background: 'linear-gradient(to top, #ff6a00, #ff4500, #cc2200, transparent)',
        borderRadius: '50% 50% 20% 20%',
        filter: 'blur(5px)',
        opacity: 0,
      }} />
      {/* 중앙 불꽃 */}
      <div className="flame-t3 absolute pointer-events-none" style={{
        left: '42%', bottom: '5%',
        width: 28, height: 80,
        background: 'linear-gradient(to top, #ffaa00, #ff6a00, #ff2200, transparent)',
        borderRadius: '50% 50% 20% 20%',
        filter: 'blur(4px)',
        opacity: 0,
      }} />
      {/* 왼쪽 작은 불꽃 */}
      <div className="flame-t4 absolute pointer-events-none" style={{
        left: '12%', bottom: '15%',
        width: 20, height: 60,
        background: 'linear-gradient(to top, #ff8800, #ff4400, transparent)',
        borderRadius: '50% 50% 20% 20%',
        filter: 'blur(3px)',
        opacity: 0,
      }} />
      {/* 오른쪽 작은 불꽃 */}
      <div className="flame-t5 absolute pointer-events-none" style={{
        right: '10%', bottom: '18%',
        width: 22, height: 65,
        background: 'linear-gradient(to top, #ff7700, #ff3300, transparent)',
        borderRadius: '50% 50% 20% 20%',
        filter: 'blur(3px)',
        opacity: 0,
      }} />
      {/* 중앙 오른쪽 불꽃 */}
      <div className="flame-t6 absolute pointer-events-none" style={{
        left: '56%', bottom: '8%',
        width: 18, height: 55,
        background: 'linear-gradient(to top, #ffcc00, #ff8800, #ff3300, transparent)',
        borderRadius: '50% 50% 20% 20%',
        filter: 'blur(3px)',
        opacity: 0,
      }} />

      {/* ── 폭발 링 3겹 ── */}
      {[
        { cls: 'flame-burst1', color: 'rgba(255,100,0,0.6)', size: 120 },
        { cls: 'flame-burst2', color: 'rgba(204,0,0,0.4)',   size: 160 },
        { cls: 'flame-burst3', color: 'rgba(180,60,0,0.25)', size: 200 },
      ].map(({ cls, color, size }) => (
        <div key={cls} className={`${cls} absolute pointer-events-none rounded-full`} style={{
          left: '50%', top: '50%',
          width: size, height: size,
          marginLeft: -size / 2, marginTop: -size / 2,
          border: `3px solid ${color}`,
          boxShadow: `0 0 12px ${color}`,
          opacity: 0,
        }} />
      ))}

      {/* ── 불씨 파티클 ── */}
      {EMBERS.map((e, i) => (
        <div
          key={i}
          className="ember absolute pointer-events-none rounded-full"
          style={{
            left: '50%', top: '50%',
            width: e.size, height: e.size,
            marginLeft: -e.size / 2, marginTop: -e.size / 2,
            background: i % 3 === 0 ? '#ffaa00' : i % 3 === 1 ? '#ff4400' : '#ffdd00',
            boxShadow: `0 0 6px ${i % 2 === 0 ? '#ff6600' : '#ffcc00'}`,
            animationDelay: e.delay,
            // @ts-ignore
            '--ex': e.x, '--ey': e.y,
          }}
        />
      ))}

      {/* ── 번개 SVG 레이어 ── */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        <svg
          width="300" height="300"
          viewBox="0 0 300 300"
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        >
          {/* 번개 1 - 왼쪽 (흰색/노란색 계열로 변경) */}
          <polyline
            className="lightning-1"
            points="80,0 65,55 90,55 60,130"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 4px #ffdd88) drop-shadow(0 0 10px #ff8800)' }}
          />
          <polyline
            className="lightning-1"
            points="80,0 65,55 90,55 60,130"
            fill="none"
            stroke="#ffffcc"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 번개 2 - 오른쪽 */}
          <polyline
            className="lightning-2"
            points="220,10 240,60 215,60 245,140"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 4px #ffee99) drop-shadow(0 0 10px #ff6600)' }}
          />
          <polyline
            className="lightning-2"
            points="220,10 240,60 215,60 245,140"
            fill="none"
            stroke="#fff0cc"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 번개 3 - 중앙 (가장 강렬) */}
          <polyline
            className="lightning-3"
            points="150,-10 135,40 158,40 130,100"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 14px #ffaa44)' }}
          />
          <polyline
            className="lightning-3"
            points="150,-10 135,40 158,40 130,100"
            fill="none"
            stroke="#fffaee"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 번개 4 - 왼쪽 작은 가지 */}
          <polyline
            className="lightning-4"
            points="50,20 38,58 55,58 30,105"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 4px #ffeeaa) drop-shadow(0 0 8px #ff7700)' }}
          />

          {/* 스파크 점 */}
          <circle className="lightning-1" cx="60"  cy="132" r="3" fill="white"
            style={{ filter: 'drop-shadow(0 0 6px #ffaa44)' }} />
          <circle className="lightning-2" cx="245" cy="142" r="3" fill="white"
            style={{ filter: 'drop-shadow(0 0 6px #ffaa44)' }} />
          <circle className="lightning-3" cx="130" cy="102" r="4" fill="white"
            style={{ filter: 'drop-shadow(0 0 8px #ffcc66)' }} />
        </svg>
      </div>

      {/* ── 임팩트 버스트 ── */}
      <div
        className="absolute hero-impact-anim pointer-events-none"
        style={{
          left: '50%', top: '50%',
          width: 200, height: 200,
          marginLeft: -100, marginTop: -100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,230,0,0.95) 0%, rgba(255,80,0,0.7) 30%, rgba(204,0,0,0.3) 60%, transparent 80%)',
        }}
      />

      {/* ── 로고 (logo-reveal: 인트로 1회 + 이후 float 유지) ── */}
      <div className="absolute" style={{ left: '50%', top: '50%', marginLeft: -130, marginTop: -130 }}>
        <Image
          src="/taes-logo.png"
          alt="TAES FC"
          width={260}
          height={260}
          className="logo-reveal"
          style={{
            filter: 'drop-shadow(0 0 28px rgba(204,0,0,0.95)) drop-shadow(0 0 56px rgba(255,80,0,0.55))',
          }}
          unoptimized
          priority
        />
      </div>

    </div>
  );
}
