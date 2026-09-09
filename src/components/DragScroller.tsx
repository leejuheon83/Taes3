'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_START = 4;   // 이 정도 움직이면 끌기로 본다 (px)
const CLICK_KILL = 6;   // 이 정도 움직였으면 클릭으로 보지 않는다 (px)

/**
 * 가로로 넘겨보는 줄.
 * - 마우스로 잡아끌어 넘길 수 있다 (터치·트랙패드는 브라우저 기본 스크롤을 그대로 쓴다)
 * - 끌고 난 직후의 클릭은 무시해서, 카드를 끌었을 때 링크로 넘어가지 않게 한다
 * - 남은 카드가 있는 쪽에만 화살표와 그림자를 보여준다
 *
 * 주의: pointer capture를 쓰면 click이 링크가 아니라 이 줄로 가버려서
 * 카드를 눌러도 이동하지 않는다. 그래서 window 리스너로 처리한다.
 */
export default function DragScroller({
  children,
  fadeColor = '#050505',
  className = '',
}: {
  children: React.ReactNode;
  fadeColor?: string;
  className?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, dragging: false, startX: 0, startScroll: 0, moved: 0 });
  const [dragging, setDragging] = useState(false);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  // 마우스로 끌어 넘기기
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const el = railRef.current;
      if (!d.down || !el) return;
      const dx = e.clientX - d.startX;
      d.moved = Math.max(d.moved, Math.abs(dx));
      if (!d.dragging && d.moved > DRAG_START) {
        d.dragging = true;
        setDragging(true);
      }
      if (d.dragging) el.scrollLeft = d.startScroll - dx;
    };
    const onUp = () => {
      const d = drag.current;
      if (!d.down) return;
      d.down = false;
      d.dragging = false;
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = railRef.current;
    drag.current.moved = 0;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    drag.current = { down: true, dragging: false, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
  };

  // 끌어서 넘긴 직후의 클릭은 링크로 전달하지 않는다
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved > CLICK_KILL) {
      e.preventDefault();
      e.stopPropagation();
    }
    drag.current.moved = 0;
  };

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: 'smooth' });
  };

  const arrow = (side: 'left' | 'right') => (
    <button
      type="button"
      aria-label={side === 'left' ? '이전 선수 보기' : '다음 선수 보기'}
      onClick={() => nudge(side === 'left' ? -1 : 1)}
      style={{
        position: 'absolute', top: '50%', [side]: 0,
        transform: 'translateY(-50%)',
        zIndex: 3, minHeight: 0,
        width: 34, height: 34, borderRadius: '50%',
        display: 'grid', placeItems: 'center',
        color: '#fff', fontSize: 15, lineHeight: 1,
        background: 'rgba(12,4,4,0.86)',
        border: '1px solid rgba(255,90,60,0.45)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        cursor: 'pointer',
      }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={railRef}
        data-rail
        className={`flex gap-3 overflow-x-auto pb-3 ${className}`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: dragging ? 'grabbing' : edge.left || edge.right ? 'grab' : 'default',
          userSelect: dragging ? 'none' : undefined,
          overscrollBehaviorX: 'contain',
        }}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        // 링크·이미지의 기본 끌기(고스트 이미지)가 넘기기를 방해하지 않게 한다
        onDragStart={e => e.preventDefault()}
      >
        {children}
      </div>

      {/* 남은 카드가 있는 쪽만 흐리게 덮어 더 있다는 걸 보여준다 */}
      {(['left', 'right'] as const).map(side => edge[side] && (
        <div key={side} aria-hidden style={{
          position: 'absolute', top: 0, bottom: 12, [side]: 0,
          width: 56, pointerEvents: 'none', zIndex: 2,
          background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${fadeColor}, transparent)`,
        }} />
      ))}
      {edge.left && arrow('left')}
      {edge.right && arrow('right')}
    </div>
  );
}
