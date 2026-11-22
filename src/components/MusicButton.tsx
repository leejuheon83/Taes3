'use client';

import { useMusic, MUSIC_CONTROL_ATTR } from '@/lib/music';

/** 상단 메뉴의 음악 끄기·켜기 버튼. 음원이 없으면 보이지 않는다. */
export default function MusicButton() {
  const { available, playing, toggle } = useMusic();
  if (!available) return null;

  const label = playing ? '음악 끄기' : '음악 켜기';
  return (
    <button
      type="button"
      onClick={toggle}
      {...{ [MUSIC_CONTROL_ATTR]: '' }}
      aria-label={playing ? '배경음악 끄기' : '배경음악 켜기'}
      aria-pressed={playing}
      title={label}
      className="nav-music"
      data-on={playing ? 'true' : 'false'}
    >
      <span className="text-[15px] leading-none" aria-hidden>{playing ? '🔊' : '🔇'}</span>
      {playing && <span className="music-bars" aria-hidden><i /><i /><i /></span>}
      <span className="nav-music__text">{label}</span>
    </button>
  );
}
