'use client';

import { useEffect } from 'react';
import { initMusic, useMusic, MUSIC_CONTROL_ATTR } from '@/lib/music';

/**
 * 배경음악을 시작시키고, 오른쪽 아래에 소리 버튼을 둔다.
 * 상단 메뉴의 버튼(MusicButton)과 같은 상태를 공유한다. 로직은 lib/music.ts에 있다.
 */
export default function MusicToggle() {
  const { available, playing, toggle } = useMusic();
  useEffect(() => { initMusic(); }, []);

  if (!available) return null;

  return (
    <button
      onClick={toggle}
      {...{ [MUSIC_CONTROL_ATTR]: '' }}
      aria-label={playing ? '배경음악 끄기' : '배경음악 켜기'}
      aria-pressed={playing}
      title={playing ? '배경음악 끄기' : '배경음악 켜기'}
      className="music-toggle"
      style={{ borderColor: playing ? '#ff3b25' : 'rgba(255,255,255,0.18)' }}
    >
      <span className="text-lg leading-none">{playing ? '🔊' : '🔇'}</span>
      {playing && <span className="music-bars" aria-hidden><i /><i /><i /></span>}
    </button>
  );
}
