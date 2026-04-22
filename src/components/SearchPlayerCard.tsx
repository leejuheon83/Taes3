'use client';

import { useState, useRef } from 'react';
import { searchRealPlayers, RealPlayer } from '@/lib/footballApi';

// 포지션 → 색상
const POS_COLOR: Record<string, string> = {
  Goalkeeper: '#f59e0b', GK: '#f59e0b',
  Defender: '#22c55e',  CB: '#22c55e', LB: '#22c55e', RB: '#22c55e', DEF: '#22c55e',
  Midfielder: '#3b82f6', MF: '#3b82f6', CM: '#3b82f6', CAM: '#3b82f6',
  Attacker: '#ef4444',  FW: '#ef4444', ST: '#ef4444', LW: '#ef4444', RW: '#ef4444',
};
function posColor(pos: string) {
  for (const [k, v] of Object.entries(POS_COLOR)) {
    if (pos.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#3b82f6';
}

// 포지션 약자 변환
function shortPos(pos: string): string {
  const map: Record<string, string> = {
    Goalkeeper: 'GK', Defender: 'CB', Midfielder: 'MF',
    Attacker: 'ST', Forward: 'FW',
  };
  return map[pos] || pos.slice(0, 3).toUpperCase();
}

export default function SearchPlayerCard() {
  const [mode, setMode] = useState<'idle' | 'input' | 'loading' | 'result'>('idle');
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState<RealPlayer | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const startSearch = () => {
    setMode('input');
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setMode('loading');
    setError('');
    try {
      const results = await searchRealPlayers(q);
      if (results.length > 0) {
        setPlayer(results[0]);
        setMode('result');
      } else {
        setError('선수를 찾을 수 없어요');
        setMode('input');
      }
    } catch {
      setError('검색 중 오류가 발생했어요');
      setMode('input');
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch(query);
    if (e.key === 'Escape') { setMode('idle'); setQuery(''); setPlayer(null); }
  };

  const reset = () => { setMode('idle'); setQuery(''); setPlayer(null); setError(''); };

  const stats = player?.stats;
  const ovr = stats ? Math.round((stats.pace + stats.shoot + stats.pass + stats.dribble + stats.defense + stats.physical) / 6) : null;
  const pos = player ? shortPos(player.position) : '';
  const col = player ? posColor(player.position) : '#3b82f6';

  // ── FIFA 카드 배경 결정 ──
  // OVR 기준: 85+ 골드, 75+ 실버, 그 외 브론즈
  const cardTier = ovr == null ? 'search'
    : ovr >= 85 ? 'gold'
    : ovr >= 75 ? 'silver'
    : 'bronze';

  const THEME = {
    search: {
      bg: 'linear-gradient(155deg,#0a0a1a 0%,#000510 60%,#000 100%)',
      border: 'rgba(59,130,246,0.6)', borderHi: '#3b82f6',
      accent: '#3b82f6', glow: '#1d4ed8', shadow: 'rgba(37,99,235,0.25)',
    },
    gold: {
      bg: 'linear-gradient(155deg,#2a1a00 0%,#1a1000 60%,#0d0800 100%)',
      border: '#a86800', borderHi: '#ffe066',
      accent: '#fbbf24', glow: '#d97706', shadow: 'rgba(217,119,6,0.3)',
    },
    silver: {
      bg: 'linear-gradient(155deg,#1a1a1a 0%,#111 60%,#080808 100%)',
      border: '#555', borderHi: '#ddd',
      accent: '#c0c0c0', glow: '#888', shadow: 'rgba(192,192,192,0.2)',
    },
    bronze: {
      bg: 'linear-gradient(155deg,#1a0d05 0%,#100800 60%,#080400 100%)',
      border: '#7a3a00', borderHi: '#cd7f32',
      accent: '#cd7f32', glow: '#a05020', shadow: 'rgba(160,80,32,0.25)',
    },
  }[cardTier];

  const uid = 'search-card';

  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      {/* ── 카드 본체 ── */}
      <div
        onClick={mode === 'idle' ? startSearch : undefined}
        style={{
          position: 'relative', overflow: 'hidden',
          aspectRatio: '3/4.2', borderRadius: 14,
          background: THEME.bg,
          boxShadow: `0 2px 0 ${THEME.border}, 0 12px 40px rgba(0,0,0,0.97), 0 0 24px ${THEME.shadow}`,
          cursor: mode === 'idle' ? 'pointer' : 'default',
          transition: 'box-shadow 0.3s',
        }}
      >
        {/* SVG 카본 파이버 + 글로우 */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <defs>
            <pattern id={`cf-${uid}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent"/>
              <rect x="0" y="0" width="2" height="2" fill="rgba(255,255,255,0.025)" rx="0.3"/>
              <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.025)" rx="0.3"/>
            </pattern>
            <radialGradient id={`glow-${uid}`} cx="50%" cy="38%" r="52%">
              <stop offset="0%" stopColor={THEME.glow} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={THEME.glow} stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cf-${uid})`}/>
          <ellipse cx="50%" cy="38%" rx="58%" ry="48%" fill={`url(#glow-${uid})`}/>
        </svg>

        {/* 광택 레이어 */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:14,
          background:'linear-gradient(128deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.02) 28%,transparent 52%)' }}/>

        {/* 메탈릭 테두리 */}
        <div style={{ position:'absolute', inset:0, borderRadius:14, zIndex:22, pointerEvents:'none',
          background:`linear-gradient(145deg,${THEME.borderHi} 0%,rgba(255,255,255,0.45) 18%,${THEME.accent} 38%,${THEME.border} 62%,${THEME.borderHi}55 85%,${THEME.border} 100%)`,
          padding:'1.5px', WebkitMask:'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite:'xor', maskComposite:'exclude' }}/>

        {/* 상단 액센트 라인 */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, zIndex:25, pointerEvents:'none',
          background:`linear-gradient(90deg,transparent,${THEME.border} 12%,${THEME.accent} 32%,rgba(255,255,200,0.8) 50%,${THEME.accent} 68%,${THEME.border} 88%,transparent)`,
          borderRadius:'14px 14px 0 0' }}/>

        {/* ━━ IDLE: 클릭 유도 화면 ━━ */}
        {mode === 'idle' && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', zIndex:15, gap:8 }}>
            <div style={{ fontSize:32, animation:'spCardBounce 1.6s ease-in-out infinite' }}>⚽</div>
            <div style={{ fontSize:9, fontWeight:900, color:THEME.accent, letterSpacing:'0.1em', textAlign:'center', lineHeight:1.5 }}>
              해외선수<br/>검색하기
            </div>
            <div style={{ width:28, height:28, borderRadius:'50%', border:`1.5px solid ${THEME.accent}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, color:THEME.accent, opacity:0.7 }}>+</div>
          </div>
        )}

        {/* ━━ INPUT: 검색 입력 ━━ */}
        {mode === 'input' && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', zIndex:15, padding:'12px 10px', gap:8 }}>
            <div style={{ fontSize:9, fontWeight:900, color:THEME.accent, letterSpacing:'0.08em', marginBottom:4 }}>
              선수 이름 입력
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="예) Mbappe"
              style={{
                width:'100%', padding:'6px 8px', fontSize:11, fontWeight:700,
                background:'rgba(0,0,0,0.6)', border:`1px solid ${THEME.accent}55`,
                borderRadius:4, color:'#fff', outline:'none', textAlign:'center',
              }}
            />
            {error && <div style={{ fontSize:8, color:'#f87171', textAlign:'center' }}>{error}</div>}
            <button
              onClick={() => doSearch(query)}
              disabled={!query.trim()}
              style={{
                padding:'5px 14px', fontSize:9, fontWeight:900,
                background: query.trim() ? THEME.accent : '#333',
                color: '#000', borderRadius:3, border:'none', cursor: query.trim() ? 'pointer' : 'not-allowed',
                letterSpacing:'0.06em',
              }}>
              SEARCH
            </button>
            <button onClick={reset} style={{ fontSize:8, color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer' }}>취소</button>
          </div>
        )}

        {/* ━━ LOADING ━━ */}
        {mode === 'loading' && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', zIndex:15, gap:10 }}>
            <div style={{ fontSize:24, animation:'spCardSpin 0.8s linear infinite' }}>⟳</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', fontWeight:700 }}>검색 중...</div>
          </div>
        )}

        {/* ━━ RESULT: FIFA 카드 ━━ */}
        {mode === 'result' && player && (
          <>
            {/* OVR + 포지션 + 클럽·국가 (좌상) */}
            <div style={{ position:'absolute', top:9, left:10, zIndex:15 }}>
              <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1,
                textShadow:`0 0 14px ${THEME.glow}, 0 2px 6px rgba(0,0,0,0.9)` }}>{ovr}</div>
              <div style={{ fontSize:8.5, fontWeight:900, color:THEME.accent, letterSpacing:'0.07em', marginTop:2,
                textShadow:`0 0 8px ${THEME.glow}` }}>{pos}</div>
              {/* 국가 이모지 (텍스트) */}
              <div style={{ marginTop:4, fontSize:8, color:'rgba(255,255,255,0.5)', fontWeight:700, maxWidth:48, lineHeight:1.2 }}>
                {player.nationality}
              </div>
            </div>

            {/* 우상: 클럽명 */}
            <div style={{ position:'absolute', top:9, right:8, zIndex:15, textAlign:'right' }}>
              <div style={{ fontSize:7, fontWeight:900, color:THEME.accent, letterSpacing:'0.04em',
                maxWidth:58, lineHeight:1.3, textAlign:'right' }}>
                {player.club}
              </div>
            </div>

            {/* 선수 사진 */}
            <div style={{ position:'absolute', bottom:'22%', left:'50%', transform:'translateX(-50%)',
              width:'92%', height:'62%', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:10 }}>
              {player.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.image}
                  alt={player.name}
                  style={{
                    maxHeight:'100%', maxWidth:'100%', objectFit:'contain',
                    filter:`drop-shadow(0 4px 18px rgba(0,0,0,0.97)) drop-shadow(0 0 12px ${THEME.glow}50)`,
                  }}
                  onError={e => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = 'none';
                    const fallback = el.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              {/* 사진 없거나 로드 실패 시 fallback */}
              <div style={{
                display: player.image ? 'none' : 'flex',
                flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%'
              }}>
                <div style={{ fontSize:42, fontWeight:900, color:THEME.accent, opacity:0.3,
                  textShadow:`0 0 28px ${THEME.glow}` }}>⚽</div>
                <div style={{ fontSize:8, color:'rgba(255,255,255,0.2)', marginTop:4 }}>사진 없음</div>
              </div>
            </div>

            {/* 하단 패널 */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:15,
              background:'linear-gradient(to top,rgba(0,0,0,0.98) 0%,rgba(0,0,0,0.88) 55%,transparent 100%)',
              padding:'24px 8px 8px', borderRadius:'0 0 14px 14px' }}>
              <div style={{ height:1, marginBottom:5,
                background:`linear-gradient(to right,transparent,${THEME.border} 10%,${THEME.accent} 32%,rgba(255,255,200,0.7) 50%,${THEME.accent} 68%,${THEME.border} 90%,transparent)`,
                boxShadow:`0 0 5px ${THEME.glow}50` }}/>
              {/* 이름 */}
              <div style={{ textAlign:'center', marginBottom:5 }}>
                <div style={{ fontSize:11, fontWeight:900, color:'#fff', letterSpacing:'0.05em',
                  textShadow:`0 0 12px ${THEME.glow}55, 0 1px 4px rgba(0,0,0,0.9)`, lineHeight:1.1 }}>
                  {player.name.split(' ').pop()}
                </div>
              </div>
              {/* 능력치 6개 */}
              {stats && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'3px 1px' }}>
                  {[
                    { k:'PAC', v:stats.pace }, { k:'SHO', v:stats.shoot }, { k:'PAS', v:stats.pass },
                    { k:'DRI', v:stats.dribble }, { k:'DEF', v:stats.defense }, { k:'PHY', v:stats.physical },
                  ].map(({ k, v }) => (
                    <div key={k} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:11, fontWeight:900, lineHeight:1,
                        color: v>=80?'#4ade80':v>=65?'#facc15':'#f87171' }}>{v}</div>
                      <div style={{ fontSize:7, fontWeight:700, color:'rgba(255,255,255,0.28)', marginTop:1 }}>{k}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 리셋 버튼 (카드 우하단 오버레이) */}
            <button onClick={reset}
              style={{ position:'absolute', top:6, right:6, zIndex:30,
                width:18, height:18, borderRadius:'50%',
                background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.2)',
                color:'rgba(255,255,255,0.5)', fontSize:10, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
              ✕
            </button>
          </>
        )}
      </div>

      {/* ── 공유 버튼 자리 맞추기 (다른 카드와 높이 통일) ── */}
      <div style={{ marginTop:8, height:34 }} />

      <style>{`
        @keyframes spCardBounce {
          0%,100% { transform:translateY(0); }
          50% { transform:translateY(-5px); }
        }
        @keyframes spCardSpin {
          from { transform:rotate(0deg); }
          to { transform:rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
