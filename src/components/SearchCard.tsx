// 홈페이지에서 축구 선수 검색을 시작하는 미니 카드

interface SearchCardProps {
  onClick: () => void;
}

export default function SearchCard({ onClick }: SearchCardProps) {
  const blue = { base: '#2563EB', glow: '#1d4ed8', border: '#1e40af', borderHi: '#3b82f6', mid: 'rgba(37,99,235,0.08)' };

  return (
    <button onClick={onClick} className="block flex-shrink-0 cursor-pointer" style={{ width: 110, background: 'none', border: 'none', padding: 0 }}>
      <div className="relative overflow-hidden transition-transform hover:scale-105"
        style={{
          aspectRatio: '3/4.2', borderRadius: 12,
          background: 'linear-gradient(155deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 50%, #000 100%)',
          boxShadow: `0 2px 0 ${blue.border}, 0 8px 32px rgba(0,0,0,0.95)`,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 0 ${blue.border}, 0 16px 40px rgba(37,99,235,0.2)`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 0 ${blue.border}, 0 8px 32px rgba(0,0,0,0.95)`; }}
      >
        {/* 카본 파이버 패턴 */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <defs>
            <pattern id="cf-search" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent"/>
              <rect x="0" y="0" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
              <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.028)" rx="0.3"/>
            </pattern>
            <radialGradient id="cg-search" cx="50%" cy="38%" r="52%">
              <stop offset="0%" stopColor={blue.glow} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={blue.glow} stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#cf-search)"/>
          <ellipse cx="50%" cy="38%" rx="58%" ry="48%" fill="url(#cg-search)"/>
        </svg>

        {/* 경사 광택 */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:12,
          background:'linear-gradient(128deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 28%, transparent 52%)' }}/>

        {/* 테두리 */}
        <div style={{ position:'absolute', inset:0, borderRadius:12, zIndex:22, pointerEvents:'none',
          background:`linear-gradient(145deg, ${blue.borderHi} 0%, rgba(255,255,255,0.5) 18%, ${blue.glow} 38%, ${blue.border} 62%, ${blue.borderHi}44 85%, ${blue.border} 100%)`,
          padding:'1.5px', WebkitMask:'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite:'xor', maskComposite:'exclude' }}/>

        {/* 상단 라인 */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, zIndex:25, pointerEvents:'none',
          background:`linear-gradient(90deg, transparent, ${blue.border} 12%, ${blue.glow} 32%, rgba(100,180,255,0.9) 50%, ${blue.glow} 68%, ${blue.border} 88%, transparent)`,
          borderRadius:'12px 12px 0 0' }}/>

        {/* TAES 로고 워터마크 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/taes-logo.png" alt="" aria-hidden style={{ position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-52%)', width:'78%', pointerEvents:'none',
          opacity:0.15, filter:'grayscale(1) brightness(2) opacity(0.5)', zIndex:2 }}/>

        {/* 중앙 검색 아이콘 */}
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:15 }}>
          <div style={{ fontSize:36, marginBottom:8, animation:'bounce 2s infinite' }}>🔍</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:900, color:blue.base, letterSpacing:'0.05em', lineHeight:1.2 }}>
              축구<br/>선수
            </div>
            <div style={{ fontSize:7.5, fontWeight:700, color:blue.base, marginTop:4, opacity:0.7 }}>
              검색하기
            </div>
          </div>
        </div>

        {/* 하단 텍스트 */}
        <div style={{ position:'absolute', bottom:8, left:0, right:0, zIndex:15, textAlign:'center' }}>
          <div style={{ fontSize:7, fontWeight:800, color:blue.base, letterSpacing:'0.06em', animation:'pulse 2s infinite' }}>
            CLICK
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </button>
  );
}
