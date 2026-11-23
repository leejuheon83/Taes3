'use client';

import { useEffect, useState } from 'react';
import { initMusic, useMusic } from '@/lib/music';

const HINT_MS = 9000;

/**
 * 배경음악을 시작시킨다.
 * 브라우저가 자동재생을 막아 첫 터치를 기다리는 동안에는, 왜 소리가 안 나는지 알 수 있게
 * 화면 아래에 안내를 잠깐 띄운다. 화면 아무 곳이나 터치하면 음악이 시작되고 안내는 사라진다.
 * 버튼과 로직은 MusicButton, lib/music.ts에 있다.
 */
export default function MusicPlayer() {
  const { blocked } = useMusic();
  const [expired, setExpired] = useState(false);

  useEffect(() => { initMusic(); }, []);
  useEffect(() => {
    if (!blocked) return;
    const t = setTimeout(() => setExpired(true), HINT_MS);
    return () => clearTimeout(t);
  }, [blocked]);

  if (!blocked || expired) return null;
  return (
    <div className="music-hint" role="status">
      <span aria-hidden>🔊</span> 화면을 터치하면 음악이 나옵니다
    </div>
  );
}
