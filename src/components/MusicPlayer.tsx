'use client';

import { useEffect } from 'react';
import { initMusic } from '@/lib/music';

/**
 * 배경음악을 시작시킨다 (화면에는 아무것도 그리지 않는다).
 * 끄고 켜는 버튼은 상단 메뉴의 MusicButton이고, 로직은 lib/music.ts에 있다.
 */
export default function MusicPlayer() {
  useEffect(() => { initMusic(); }, []);
  return null;
}
