'use client';

import Image from 'next/image';

export default function HeroAnimation() {
  return (
    <div className="flex-shrink-0 relative" style={{ width: 300, height: 300 }}>

      {/* ── 정적 잔광 (움직임 없음) ── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          inset: '-40px',
          background: 'radial-gradient(circle, rgba(204,0,0,0.32) 0%, rgba(180,30,0,0.16) 45%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* ── 로고 (정지) ── */}
      <div className="absolute" style={{ left: '50%', top: '50%', marginLeft: -130, marginTop: -130 }}>
        <Image
          src="/taes-logo.png"
          alt="TAES FC"
          width={260}
          height={260}
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
