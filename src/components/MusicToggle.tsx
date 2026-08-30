'use client';

import { useEffect, useRef, useState } from 'react';

const MUSIC_SRC = '/taes-anthem.mp3';
const PREF_KEY = 'taes-music-on';

/**
 * 우측 하단 소리 버튼.
 * - 자동 재생하지 않는다. 사용자가 눌러야 시작한다(브라우저 자동재생 차단 정책).
 * - 켠 상태는 기억해 두고, 다음 방문 때 재생을 시도한다.
 *   차단되면 조용히 꺼진 상태로 둔다.
 * - 음원 파일이 없으면 버튼 자체를 숨긴다.
 */
export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'metadata';

    const onReady = () => {
      setAvailable(true);
      // 이전에 켜 두었다면 재생을 시도한다 (차단되면 무시)
      if (localStorage.getItem(PREF_KEY) === '1') {
        audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
    };
    const onError = () => setAvailable(false);

    audio.addEventListener('loadedmetadata', onReady);
    audio.addEventListener('error', onError);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      localStorage.setItem(PREF_KEY, '0');
    } else {
      audio.play()
        .then(() => {
          setPlaying(true);
          localStorage.setItem(PREF_KEY, '1');
        })
        .catch(() => setPlaying(false));
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
