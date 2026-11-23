'use client';

import { useMusic, MUSIC_CONTROL_ATTR } from '@/lib/music';

/** 상단 빨간 줄 오른쪽 끝의 작은 음악 끄기·켜기 버튼. 음원이 없으면 보이지 않는다. */
export default function MusicButton() {
  const { available, playing, blocked, toggle } = useMusic();
  if (!available) return null;

  const label = playing ? '배경음악 끄기' : '배경음악 켜기';
  return (
    <button
      type="button"
      onClick={toggle}
      {...{ [MUSIC_CONTROL_ATTR]: '' }}
      aria-label={label}
      aria-pressed={playing}
      title={label}
      className="nav-music"
      data-on={playing ? 'true' : 'false'}
      data-hint={blocked ? 'true' : 'false'}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5H4z" fill="currentColor" stroke="none" />
        {playing ? (
          <>
            <path d="M16 9.2a4 4 0 0 1 0 5.6" />
            <path d="M18.6 6.6a7.6 7.6 0 0 1 0 10.8" />
          </>
        ) : (
          <path d="M16.2 9.6l5 4.8M21.2 9.6l-5 4.8" />
        )}
      </svg>
    </button>
  );
}
