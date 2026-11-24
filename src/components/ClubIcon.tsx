import type { CSSProperties } from 'react';

export type ClubIconName = 'cup' | 'pin' | 'ball' | 'crown' | 'road' | 'chart' | 'calendar' | 'edit' | 'trash' | 'route' | 'plus' | 'medal' | 'shield';
const paths: Record<ClubIconName, React.ReactNode> = {
  medal: <><path d="m7 2 5 7 5-7M5 2h4M15 2h4"/><circle cx="12" cy="15" r="6"/><circle cx="12" cy="15" r="2"/></>,
  shield: <path d="M4 3h16v8c0 6-8 11-8 11S4 17 4 11V3Z"/>,
  cup: <><path d="M7 3h10v6a5 5 0 0 1-10 0V3Z M7 5H3v3a4 4 0 0 0 5 4 M17 5h4v3a4 4 0 0 1-5 4 M12 14v6 M8 21h8" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  ball: <><circle cx="12" cy="12" r="10"/><path d="m12 7 5 4-2 6H9l-2-6 5-4ZM12 7V2 M17 11l5-2 M15 17l3 4 M9 17l-3 4 M7 11 2 9"/></>,
  crown: <><path d="m3 6 5 5 4-8 4 8 5-5-2 12H5L3 6ZM5 22h14"/></>,
  road: <><path d="m8 2-5 20h18L16 2H8Z M12 3v4 M12 11v3 M12 18v4"/></>,
  chart: <><path d="M3 22V11h3v11 M10 22V3h3v19 M17 22V8h3v14"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6 M17 2v6 M3 11h18"/></>,
  edit: <><path d="m15 4 5 5 M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15v6Z"/></>,
  trash: <><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7"/></>,
  route: <><circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12 M18 6v2c0 6-12 2-12 8"/></>,
  plus: <path d="M12 3v18 M3 12h18"/>,
};
export default function ClubIcon({ name, style }: { name: ClubIconName; style?: CSSProperties }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
