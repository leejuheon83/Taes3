'use client';

import { useSyncExternalStore } from 'react';

/**
 * 배경음악 상태를 한곳에서 관리한다. 오른쪽 아래 버튼과 상단 메뉴의 버튼이
 * 같은 상태를 보고 같은 음악을 켜고 끈다.
 *
 * - 기본은 켜짐. 접속하면 바로 재생을 시도한다.
 * - 브라우저가 자동재생을 막으면 첫 터치·클릭·키 입력에서 시작한다.
 * - 직접 끄면 그 선택을 기억해서 다시 틀지 않는다.
 * - 탭이 가려지면 멈췄다가 돌아오면 이어서 재생한다.
 * - 음원 파일이 없으면 available이 false로 남아 버튼이 숨겨진다.
 */

const MUSIC_SRC = '/taes-anthem.mp3';
const PREF_KEY = 'taes-music-on';   // '0' = 사용자가 직접 껐음, 그 외 = 켜 둠(기본)
const VOLUME = 0.35;
const FADE_MS = 1800;
/** 소리 버튼 자신을 누른 동작은 "첫 터치로 시작"에서 제외한다 (누르자마자 꺼지는 것을 막음) */
export const MUSIC_CONTROL_ATTR = 'data-music-control';

type Snapshot = { available: boolean; playing: boolean };
const SERVER_SNAPSHOT: Snapshot = { available: false, playing: false };

let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let started = false;
let audio: HTMLAudioElement | null = null;
let want = true;
let fadeRaf: number | null = null;

function set(next: Partial<Snapshot>) {
  const merged = { ...snapshot, ...next };
  if (merged.available === snapshot.available && merged.playing === snapshot.playing) return;
  snapshot = merged;
  listeners.forEach(l => l());
}

function fadeIn(a: HTMLAudioElement) {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min((now - t0) / FADE_MS, 1);
    a.volume = VOLUME * k;
    if (k < 1) fadeRaf = requestAnimationFrame(step);
  };
  fadeRaf = requestAnimationFrame(step);
}

function savePref(on: boolean) {
  try { localStorage.setItem(PREF_KEY, on ? '1' : '0'); } catch { /* 저장소 차단 */ }
}

/** 처음 한 번만 음악을 준비한다. 여러 번 불러도 안전하다. */
export function initMusic() {
  if (started || typeof window === 'undefined') return;
  started = true;

  let pref: string | null = null;
  try { pref = localStorage.getItem(PREF_KEY); } catch { /* 무시 */ }
  want = pref !== '0';

  const a = new Audio(MUSIC_SRC);
  a.loop = true;
  a.preload = 'auto';
  a.volume = 0;
  audio = a;

  const start = (): Promise<void> => {
    if (!want || !a.paused) return Promise.resolve();
    a.volume = 0;
    return a.play().then(() => fadeIn(a)).catch(() => { /* 막힘: 첫 동작을 기다린다 */ });
  };

  const onGesture = (e: Event) => {
    if ((e.target as Element | null)?.closest?.(`[${MUSIC_CONTROL_ATTR}]`)) return;
    if (!want) { removeGesture(); return; }
    start().then(() => { if (!a.paused) removeGesture(); });
  };
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const addGesture = () => events.forEach(ev => window.addEventListener(ev, onGesture, { capture: true, passive: true }));
  const removeGesture = () => events.forEach(ev => window.removeEventListener(ev, onGesture, { capture: true }));

  a.addEventListener('play', () => set({ playing: true }));
  a.addEventListener('pause', () => set({ playing: false }));
  a.addEventListener('error', () => set({ available: false }));
  a.addEventListener('canplay', () => {
    set({ available: true });
    if (want) start().then(() => { if (a.paused) addGesture(); });
  }, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) a.pause();
    else if (want) start();
  });
}

/** 소리를 끄고 켠다. 직접 끄면 그 선택을 기억한다. */
export function toggleMusic() {
  const a = audio;
  if (!a) return;
  if (!a.paused) {
    want = false;
    a.pause();
    savePref(false);
  } else {
    want = true;
    a.volume = VOLUME;
    a.play().catch(() => set({ playing: false }));
    savePref(true);
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useMusic() {
  const s = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
  return { ...s, toggle: toggleMusic };
}
