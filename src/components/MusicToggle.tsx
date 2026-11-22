'use client';

import { useEffect, useRef, useState } from 'react';

const MUSIC_SRC = '/taes-anthem.mp3';
const PREF_KEY = 'taes-music-on';   // '0' = 사용자가 직접 껐음, 그 외 = 켜 둠(기본)
const VOLUME = 0.35;
const FADE_MS = 1800;

/**
 * 홈페이지 배경음악.
 * - 기본은 켜짐. 접속하면 바로 재생을 시도한다.
 * - 브라우저는 소리가 나는 자동재생을 막으므로, 막히면 첫 터치·클릭·키 입력에서 시작한다.
 * - 우측 하단 버튼으로 끄고 켠다. 직접 끄면 그 선택을 기억해서 다시 틀지 않는다.
 * - 페이지를 옮겨도(layout에 있음) 음악이 끊기지 않고, 탭이 가려지면 멈췄다가 돌아오면 이어서 재생한다.
 * - 음원 파일이 없으면 버튼 자체를 숨긴다.
 */
export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const wantRef = useRef(true);          // 사용자가 듣고 싶어 하는 상태 (끄기 전까지 true)
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let pref: string | null = null;
    try { pref = localStorage.getItem(PREF_KEY); } catch { /* 저장소 차단 */ }
    wantRef.current = pref !== '0';

    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audioRef.current = audio;

    const fadeIn = () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min((now - t0) / FADE_MS, 1);
        audio.volume = VOLUME * k;
        if (k < 1) fadeRef.current = requestAnimationFrame(step);
      };
      fadeRef.current = requestAnimationFrame(step);
    };

    const start = () => {
      if (!wantRef.current || !audio.paused) return Promise.resolve();
      audio.volume = 0;
      return audio.play().then(() => { setPlaying(true); fadeIn(); }).catch(() => setPlaying(false));
    };

    // 자동재생이 막혔을 때: 첫 사용자 동작에서 시작한다 (소리 버튼 자신을 누른 건 제외)
    const onGesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('.music-toggle')) return;
      if (!wantRef.current) { removeGesture(); return; }
      start().then(() => { if (!audio.paused) removeGesture(); });
    };
    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    const addGesture = () => events.forEach(ev => window.addEventListener(ev, onGesture, { capture: true, passive: true }));
    const removeGesture = () => events.forEach(ev => window.removeEventListener(ev, onGesture, { capture: true }));

    const onVisibility = () => {
      if (document.hidden) audio.pause();
      else if (wantRef.current) start();
    };

    const onReady = () => {
      setAvailable(true);
      if (wantRef.current) { start().then(() => { if (audio.paused) addGesture(); }); }
    };
    const onError = () => setAvailable(false);

    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('play', () => setPlaying(true));
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      removeGesture();
      document.removeEventListener('visibilitychange', onVisibility);
      audio.removeEventListener('error', onError);
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      wantRef.current = false;
      audio.pause();
      try { localStorage.setItem(PREF_KEY, '0'); } catch { /* 무시 */ }
    } else {
      wantRef.current = true;
      audio.volume = VOLUME;
      audio.play().catch(() => setPlaying(false));
      try { localStorage.setItem(PREF_KEY, '1'); } catch { /* 무시 */ }
    }
  }

  if (!available) return null;

  return (
    <button
      onClick={toggle}
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
