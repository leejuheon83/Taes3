// 실제 축구 선수 검색 결과를 표시하는 축구카드

import { RealPlayer } from '@/lib/footballApi';

interface RealPlayerCardProps {
  player: RealPlayer;
}

export default function RealPlayerCard({ player }: RealPlayerCardProps) {
  const stats = player.stats || { pace: 70, shoot: 70, pass: 70, dribble: 70, defense: 70, physical: 70 };
  const ovr = Math.round((stats.pace + stats.shoot + stats.pass + stats.dribble + stats.defense + stats.physical) / 6);
  const posColor = {
    'GK': '#7C3AED',
    'DEF': '#059669',
    'MF': '#2563EB',
    'FW': '#DC2626',
  } as Record<string, string>;

  // 포지션 약자 추출
  const pos = player.position ? player.position.split(',')[0].trim() : '?';
  const posKey = pos === 'G' ? 'GK' : pos === 'D' ? 'DEF' : pos === 'M' ? 'MF' : pos === 'F' ? 'FW' : 'MF';
  const posColorValue = posColor[posKey] || '#2563EB';

  return (
    <div className="relative overflow-hidden flex-shrink-0" style={{ width: 140 }}>
      <div className="relative overflow-hidden"
        style={{
          aspectRatio: '3/4.2', borderRadius: 14,
          background: 'linear-gradient(155deg, #140000 0%, #060000 50%, #000 100%)',
          boxShadow: '0 2px 0 #7a0000, 0 8px 32px rgba(0,0,0,0.95)',
        }}
      >
        {/* 카본 파이버 */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <pattern id={`cf-real-${player.id}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent"/>
              <rect x="0" y="0" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
              <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
            </pattern>
            <radialGradient id={`cg-real-${player.id}`} cx="50%" cy="38%" r="52%">
              <stop offset="0%" stopColor="#bb0000" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#bb0000" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cf-real-${player.id})`}/>
          <ellipse cx="50%" cy="38%" rx="58%" ry="48%" fill={`url(#cg-real-${player.id})`}/>
        </svg>

        {/* 경사 광택 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 14,
          background: 'linear-gradient(128deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 28%, transparent 52%)' }}/>

        {/* 테두리 */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, zIndex: 22, pointerEvents: 'none',
          background: 'linear-gradient(145deg, #ff4444 0%, rgba(255,255,255,0.5) 18%, #dc2626 38%, #7a0000 62%, #ff444444 85%, #7a0000 100%)',
          padding: '1.5px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}/>

        {/* 상단 라인 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 25, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent, #7a0000 12%, #dc2626 32%, rgba(255,180,180,0.9) 50%, #dc2626 68%, #7a0000 88%, transparent)',
          borderRadius: '14px 14px 0 0' }}/>

        {/* OVR + 포지션 (상단 좌측) */}
        <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 15 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1,
            textShadow: '0 0 12px #bb0000, 0 2px 6px rgba(0,0,0,0.9)' }}>{ovr}</div>
          <div style={{ fontSize: 8, fontWeight: 900, color: '#ff5252', letterSpacing: '0.06em', marginTop: 2,
            textShadow: '0 0 7px #bb0000' }}>{pos}</div>
        </div>

        {/* 클럽 정보 뱃지 */}
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 15, textAlign: 'right' }}>
          <div style={{ fontSize: 6.5, fontWeight: 900, color: '#ff5252', letterSpacing: '0.05em', lineHeight: 1, maxWidth: 60 }}>
            {player.club}
          </div>
        </div>

        {/* 선수 사진 또는 플레이스홀더 */}
        <div style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '62%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10 }}>
          {player.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.image} alt={player.name}
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.95)) drop-shadow(0 0 10px #bb000030)' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#dc2626', opacity: 0.4,
              textShadow: '0 0 20px #bb0000' }}>⚽</div>
          </div>
        </div>

        {/* 하단 정보 패널 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
          background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.85) 55%, transparent 100%)',
          padding: '20px 8px 8px', borderRadius: '0 0 14px 14px' }}>
          <div style={{ height: 1, marginBottom: 6,
            background: 'linear-gradient(to right, transparent, #7a0000 10%, #ff5252 32%, rgba(255,200,200,0.7) 50%, #ff5252 68%, #7a0000 90%, transparent)',
            boxShadow: '0 0 4px #bb000045' }}/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.04em',
              textShadow: '0 0 10px #bb000055', marginBottom: 4, lineHeight: 1.1 }}>
              {player.name}
            </div>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>
              {player.nationality}
            </div>
            {/* 능력치 미니 바 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px 2px', marginTop: 4 }}>
              {[
                { k: 'PAC', v: stats.pace },
                { k: 'SHO', v: stats.shoot },
                { k: 'PAS', v: stats.pass },
              ].map(({ k, v }) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, lineHeight: 1,
                    color: v >= 80 ? '#4ade80' : v >= 65 ? '#facc15' : '#f87171',
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{v}</div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em', marginTop: 1 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
