'use client';

/** 로딩 중 자리를 미리 잡아주는 회색 블록 */
export function SkeletonBox({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={style}
      aria-hidden
    />
  );
}

/** 갤러리·영상용 카드 격자 스켈레톤 */
export function SkeletonGrid({ count = 8, aspect = '1 / 1' }: { count?: number; aspect?: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" aria-label="불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-white/5" style={{ backgroundColor: '#0a0a0a' }}>
          <SkeletonBox style={{ aspectRatio: aspect }} />
          <div className="p-3 space-y-2">
            <SkeletonBox style={{ height: 12, width: '75%' }} />
            <SkeletonBox style={{ height: 10, width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 목록형(경기·공지) 스켈레톤 */
export function SkeletonRows({ count = 5, height = 76 }: { count?: number; height?: number }) {
  return (
    <div className="space-y-3" aria-label="불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} style={{ height }} />
      ))}
    </div>
  );
}
