'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';

// ── 이미지 압축 (canvas 리사이즈 후 JPEG 변환) ──
function compressImage(file: File, maxDim = 600, quality = 0.8): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round((height / width) * maxDim); width = maxDim; }
        else { width = Math.round((width / height) * maxDim); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      // 투명 배경 유지: clearRect로 초기화 후 그림 (JPEG 대신 PNG 사용)
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      // PNG: 투명 배경 보존 / JPEG: 배경이 검정으로 변환되므로 PNG 우선
      const isPng = file.type === 'image/png';
      resolve(isPng
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality)
      );
    };
    img.src = url;
  });
}

type PosKey = 'GK' | 'DF' | 'MF' | 'FW';
type Player = {
  id: number;
  no: number;
  name: string;
  pos: string; // 복수 선택 시 첫 번째 포지션 (카드 테마용)
  positions: PosKey[]; // 전체 포지션 목록
  grade: '3학년';
  stats: { spd: number; sht: number; pas: number; dri: number; def: number; phy: number };
  photo?: string;
  modelPhoto?: string;
};

const STORAGE_KEY = 'taes-players-v2';

const posColors: Record<string, string> = { GK: '#7C3AED', DF: '#059669', MF: '#2563EB', FW: '#DC2626' };
const GRADE_COLOR: Record<string, string> = { '3학년': '#CC0000' };

function getCardColors(pos: string) {
  const c = posColors[pos] ?? '#CC0000';
  return { from: c, card: '#080808' };
}

function StatBar({ value, label }: { value: number; label: string }) {
  const color = value >= 78 ? '#22c55e' : value >= 62 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black text-white/40 w-7">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-black w-5 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

// 포지션별 카드 테마 — 배경은 사이트 톤(다크 블랙/레드) 통일, 포지션은 테두리·액센트만
const cardThemes: Record<string, { bg: string; accent: string; border: string; glow: string; stripe: string }> = {
  GK: {
    bg: 'linear-gradient(160deg,#0a0800 0%,#1a1000 40%,#050505 100%)',
    accent: '#fbbf24', glow: '#f59e0b',
    border: 'linear-gradient(135deg,#fbbf24 0%,#fef3c7 25%,#d97706 50%,#fde68a 75%,#92400e 100%)',
    stripe: 'rgba(251,191,36,0.08)',
  },
  DF: {
    bg: 'linear-gradient(160deg,#00060f 0%,#000d1a 40%,#050505 100%)',
    accent: '#60a5fa', glow: '#3b82f6',
    border: 'linear-gradient(135deg,#60a5fa 0%,#eff6ff 25%,#2563eb 50%,#bfdbfe 75%,#1e40af 100%)',
    stripe: 'rgba(96,165,250,0.08)',
  },
  MF: {
    bg: 'linear-gradient(160deg,#00080a 0%,#001014 40%,#050505 100%)',
    accent: '#4ade80', glow: '#22c55e',
    border: 'linear-gradient(135deg,#4ade80 0%,#f0fdf4 25%,#16a34a 50%,#bbf7d0 75%,#15803d 100%)',
    stripe: 'rgba(74,222,128,0.08)',
  },
  FW: {
    bg: 'linear-gradient(160deg,#0a0000 0%,#1a0000 40%,#050505 100%)',
    accent: '#f87171', glow: '#ef4444',
    border: 'linear-gradient(135deg,#f87171 0%,#fef2f2 25%,#dc2626 50%,#fca5a5 75%,#991b1b 100%)',
    stripe: 'rgba(248,113,113,0.08)',
  },
};

function FifaCard({ player, onClick }: { player: Player; onClick: () => void }) {
  const theme = cardThemes[player.pos] ?? cardThemes.FW;
  const hasBack = !!player.modelPhoto;
  const ovr = Math.round((player.stats.spd + player.stats.sht + player.stats.pas + player.stats.dri + player.stats.def + player.stats.phy) / 6);
  const stats = [
    { k: 'PAC', v: player.stats.spd },
    { k: 'SHO', v: player.stats.sht },
    { k: 'PAS', v: player.stats.pas },
    { k: 'DRI', v: player.stats.dri },
    { k: 'DEF', v: player.stats.def },
    { k: 'PHY', v: player.stats.phy },
  ];

  return (
    <div
      className="relative cursor-pointer hover:z-10"
      style={{ minWidth: '150px', perspective: '900px' }}
      onClick={onClick}
    >
      <div
        className="relative transition-all duration-500"
        style={{ transformStyle: 'preserve-3d' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = hasBack ? 'rotateY(180deg)' : 'scale(1.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'rotateY(0deg)'; }}
      >
        {/* ── 앞면 ── */}
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: '3/4.2',
            borderRadius: '12px',
            background: theme.bg,
            boxShadow: `0 8px 40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06), 0 0 30px ${theme.glow}30`,
            backfaceVisibility: 'hidden',
          }}
        >
          {/* 메탈릭 테두리 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '12px', zIndex: 20,
            background: theme.border, padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />

          {/* ── 배경 레이어들 ── */}
          {/* 대각선 스트라이프 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            backgroundImage: `repeating-linear-gradient(45deg, ${theme.stripe} 0px, ${theme.stripe} 2px, transparent 2px, transparent 18px)`,
          }} />

          {/* 홀로그래픽 원형 + 방사선 SVG */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* 큰 글로우 원 */}
            <circle cx="50%" cy="35%" r="90" fill={`${theme.glow}22`} />
            <circle cx="50%" cy="35%" r="60" fill={`${theme.glow}15`} />
            {/* 동심원 */}
            {[45, 75, 105, 140, 175, 210].map(r => (
              <circle key={r} cx="50%" cy="35%" r={r} fill="none" stroke={theme.accent} strokeWidth="0.6" opacity="0.2" />
            ))}
            {/* 방사선 */}
            {Array.from({length: 16}, (_, i) => i * 22.5).map(deg => {
              const rad = (deg * Math.PI) / 180;
              return <line key={deg} x1="50%" y1="35%"
                x2={`calc(50% + ${220 * Math.cos(rad)}px)`}
                y2={`calc(35% + ${220 * Math.sin(rad)}px)`}
                stroke={theme.accent} strokeWidth="0.4" opacity="0.12" />;
            })}
            {/* 별 장식들 */}
            {[
              { x: '15%', y: '12%', size: 6 }, { x: '82%', y: '8%', size: 8 },
              { x: '88%', y: '22%', size: 5 }, { x: '10%', y: '28%', size: 4 },
              { x: '90%', y: '55%', size: 5 }, { x: '8%', y: '60%', size: 4 },
              { x: '20%', y: '72%', size: 3 }, { x: '78%', y: '70%', size: 4 },
            ].map((s, i) => (
              <g key={i} transform={`translate(${s.x === s.x ? 0 : 0}, 0)`}>
                <text x={s.x} y={s.y} fontSize={s.size * 2} fill={theme.accent} opacity="0.6" textAnchor="middle">✦</text>
              </g>
            ))}
          </svg>

          {/* 하단 바닥 글로우 */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', pointerEvents: 'none',
            background: `radial-gradient(ellipse 80% 40% at 50% 100%, ${theme.glow}35, transparent 70%)`,
          }} />

          {/* 광택 쉰 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '12px',
            background: 'linear-gradient(130deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 25%, transparent 55%)',
          }} />

          {/* ── 선수 사진 ── */}
          <div style={{
            position: 'absolute', bottom: '21%', left: '50%',
            transform: 'translateX(-50%)',
            width: '92%', height: '64%',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 5,
          }}>
            {player.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo} alt={player.name} style={{
                maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
              }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ fontSize: 38, fontWeight: 900, color: theme.accent, opacity: 0.5,
                  textShadow: `0 0 30px ${theme.glow}` }}>#{player.no}</div>
                <div style={{ fontSize: 22, opacity: 0.2, marginTop: 4 }}>⚽</div>
              </div>
            )}
          </div>

          {/* ── 상단 좌측: OVR + 포지션 ── */}
          <div style={{ position: 'absolute', top: 10, left: 11, textAlign: 'center', zIndex: 10 }}>
            <div style={{
              fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1,
              textShadow: `0 0 16px ${theme.glow}, 0 2px 8px rgba(0,0,0,0.9)`,
            }}>{ovr}</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, letterSpacing: '0.08em', marginTop: 2 }}>{(player.positions ?? [player.pos]).join('·')}</div>
          </div>

          {/* ── 상단 우측: TAES ── */}
          <div style={{ position: 'absolute', top: 10, right: 10, textAlign: 'right', zIndex: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: theme.accent, letterSpacing: '0.12em', opacity: 0.8 }}>TAES</div>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 1 }}>FC</div>
          </div>

          {/* ── 하단 정보 ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            background: `linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.85) 50%, transparent 100%)`,
            padding: '32px 10px 10px',
            borderRadius: '0 0 12px 12px',
          }}>
            {/* 구분선 */}
            <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${theme.accent}90, transparent)`, marginBottom: 7 }} />
            {/* 이름 + 등번호 */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff',
                letterSpacing: '0.05em',
                textShadow: `0 0 12px ${theme.glow}60, 0 1px 4px rgba(0,0,0,0.9)` }}>
                {player.name}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                marginTop: 3, padding: '2px 8px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>No.</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff',
                  textShadow: `0 0 10px ${theme.glow}, 0 1px 3px rgba(0,0,0,0.8)` }}>{player.no}</span>
              </div>
            </div>
            {/* 스탯 6개 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px 2px' }}>
              {stats.map(({ k, v }) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 900, lineHeight: 1,
                    color: v >= 80 ? '#4ade80' : v >= 65 ? '#facc15' : '#f87171',
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  }}>{v}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginTop: 1 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 뒷면 (3D 유니폼 사진 있을 때만) ── */}
        {hasBack && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={{
              borderRadius: '12px',
              background: theme.bg,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.8)`,
            }}
          >
            {/* 메탈릭 테두리 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '12px',
              background: theme.border,
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }} />
            <div className="text-[9px] font-black tracking-widest mb-2 z-10" style={{ color: theme.accent }}>TAES FC PREMIER</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={player.modelPhoto} alt="3D" className="z-10" style={{ width: '80%', objectFit: 'contain' }} />
            <div className="mt-2 text-center z-10">
              <div className="text-white font-black text-sm">{player.name}</div>
              <div className="text-[11px] font-bold mt-0.5" style={{ color: theme.accent }}>No.{player.no} · {(player.positions ?? [player.pos]).join('·')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 폼 타입 ──
const ALL_POS: PosKey[] = ['GK', 'DF', 'MF', 'FW'];
const emptyForm = {
  no: '', name: '',
  positions: ['FW'] as PosKey[],
  grade: '3학년' as Player['grade'],
  spd: '', sht: '', pas: '', dri: '', def: '', phy: '',
  photo: '',
  modelPhoto: '',
};
type FormState = typeof emptyForm;

function playerToForm(p: Player): FormState {
  return {
    no: String(p.no), name: p.name,
    positions: (p.positions?.length ? p.positions : [p.pos as PosKey]),
    grade: p.grade,
    spd: String(p.stats.spd), sht: String(p.stats.sht), pas: String(p.stats.pas),
    dri: String(p.stats.dri), def: String(p.stats.def), phy: String(p.stats.phy),
    photo: p.photo ?? '',
    modelPhoto: p.modelPhoto ?? '',
  };
}
function formToPlayer(f: FormState, id: number): Player {
  const positions = f.positions.length ? f.positions : ['FW' as PosKey];
  return {
    id, no: Number(f.no), name: f.name,
    pos: positions[0],
    positions,
    grade: f.grade,
    stats: { spd: Number(f.spd), sht: Number(f.sht), pas: Number(f.pas), dri: Number(f.dri), def: Number(f.def), phy: Number(f.phy) },
    photo: f.photo || undefined,
    modelPhoto: f.modelPhoto || undefined,
  };
}

const iCls = "w-full px-3 py-2 bg-[#0e0e0e] border border-white/10 text-white text-sm focus:border-red-700 outline-none";
const sCls = "w-full px-3 py-2 bg-[#0e0e0e] border border-white/10 text-white text-sm focus:border-red-700 outline-none";
const lCls = "block text-white/40 text-[11px] font-bold mb-1 uppercase tracking-wider";

// ── 스켈레톤 카드 ──
function SkeletonCard() {
  return (
    <div className="relative p-3 overflow-hidden animate-pulse"
      style={{ background: '#111111', border: '2px solid rgba(255,255,255,0.06)', borderRadius: '8px', minWidth: '155px' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-5 rounded" style={{ backgroundColor: '#2a2a2a' }} />
        <div className="w-12 h-4 rounded" style={{ backgroundColor: '#2a2a2a' }} />
      </div>
      <div className="flex justify-center my-2">
        <div className="w-20 h-20 rounded-full" style={{ backgroundColor: '#2a2a2a' }} />
      </div>
      <div className="text-center mb-3">
        <div className="w-20 h-4 rounded mx-auto mb-1" style={{ backgroundColor: '#2a2a2a' }} />
        <div className="w-16 h-3 rounded mx-auto" style={{ backgroundColor: '#2a2a2a' }} />
      </div>
      <div className="h-px mb-3" style={{ backgroundColor: '#2a2a2a' }} />
      <div className="space-y-2">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-2 rounded" style={{ backgroundColor: '#2a2a2a' }} />
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }} />
            <div className="w-5 h-2 rounded" style={{ backgroundColor: '#2a2a2a' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersContent() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGrade, setActiveGrade] = useState<'전체' | '3학년'>('전체');
  const [search, setSearch] = useState('');
  const [activePos, setActivePos] = useState('전체');
  const [selected, setSelected] = useState<Player | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setPlayers(saved ? JSON.parse(saved) : []);
    setLoading(false);
  }, []);

  const save = (updated: Player[]) => {
    setPlayers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      alert('저장 공간이 부족합니다. 사진 용량을 줄여주세요.');
    }
  };

  const sf = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 400, 0.85);
    setForm(f => ({ ...f, photo: compressed }));
  };

  const handleModelPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 500, 0.85);
    setForm(f => ({ ...f, modelPhoto: compressed }));
  };


  const openEdit = (p: Player) => requireAdmin(() => { setForm(playerToForm(p)); setEditMode(true); setAddMode(false); });
  const openAdd  = () => requireAdmin(() => { setForm(emptyForm); setAddMode(true); setEditMode(false); setSelected(null); });
  const closeModal = () => { setSelected(null); setEditMode(false); setAddMode(false); setDeleteTarget(null); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode && selected) {
      const updatedPlayer = formToPlayer(form, selected.id);
      const updated = players.map(p => p.id === selected.id ? updatedPlayer : p);
      save(updated);
      setEditMode(false);
      setAddMode(false);
      setSelected(updatedPlayer);
    } else if (addMode) {
      const newId = Math.max(0, ...players.map(p => p.id)) + 1;
      save([...players, formToPlayer(form, newId)]);
      closeModal();
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    save(players.filter(p => p.id !== deleteTarget.id));
    closeModal();
  };

  const filtered = players.filter(p => {
    const mg = activeGrade === '전체' || p.grade === activeGrade;
    const mp = activePos === '전체' || (p.positions ?? [p.pos]).includes(activePos as PosKey);
    return mg && mp && p.name.includes(search);
  });

  const count3 = players.filter(p => p.grade === '3학년').length;
  const showForm = editMode || addMode;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #050505 0%, #1a0000 100%)' }}>
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>PLAYERS</div>
            <h1 className="text-4xl font-black text-white mb-2">등록 선수</h1>
            <p className="text-white/40 text-sm">카드를 클릭하면 수정·삭제할 수 있습니다 ⚽</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 font-bold text-white text-sm hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#CC0000' }}>
            + 선수 등록
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center flex-wrap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">🔍</span>
            <input type="text" placeholder="선수 이름 검색" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm text-white outline-none w-48"
              style={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }} />
          </div>
          <div className="flex items-center px-4 py-2 text-sm font-black" style={{ backgroundColor: '#CC0000', color: '#fff' }}>
            전체 ({players.length})
          </div>
          <div className="flex gap-1 ml-auto">
            {(['전체', 'GK', 'DF', 'MF', 'FW'] as const).map(pos => (
              <button key={pos} onClick={() => setActivePos(pos)}
                className="px-3 py-2 text-xs font-black transition-colors"
                style={{
                  backgroundColor: activePos === pos ? (posColors[pos] ?? '#CC0000') : '#0e0e0e',
                  color: activePos === pos ? '#fff' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${activePos === pos ? (posColors[pos] ?? '#CC0000') : 'rgba(255,255,255,0.1)'}`,
                }}>
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* 카드 목록 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-white/25 border border-white/5" style={{ backgroundColor: '#080808' }}>
            <div className="text-6xl mb-4">⚽</div>
            <div className="text-lg font-bold mb-2">등록된 선수가 없습니다</div>
            <div className="text-sm text-white/20">상단의 <span className="text-red-500 font-bold">+ 선수 등록</span> 버튼을 눌러 선수를 추가하세요</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(p => (
              <FifaCard key={p.id} player={p} onClick={() => { setSelected(p); setEditMode(false); }} />
            ))}
          </div>
        )}
      </div>

      {/* ── 상세 / 수정 모달 ── */}
      {(selected || addMode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-xl border border-white/10 overflow-y-auto max-h-[92vh]" style={{ backgroundColor: '#080808' }}>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-black text-white text-lg">
                {addMode ? '선수 등록' : showForm ? '선수 수정' : selected?.name}
              </h2>
              <div className="flex items-center gap-2">
                {selected && !showForm && (
                  <>
                    <button onClick={() => openEdit(selected)}
                      className="px-4 py-1.5 text-xs font-bold text-white border border-white/20 hover:border-white/50 transition-colors">
                      수정
                    </button>
                    <button onClick={() => requireAdmin(() => setDeleteTarget(selected))}
                      className="px-4 py-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#dc2626' }}>
                      삭제
                    </button>
                  </>
                )}
                <button onClick={closeModal} className="text-white/40 hover:text-white text-2xl leading-none ml-2">×</button>
              </div>
            </div>

            {/* 상세 보기 */}
            {selected && !showForm && (
              <div className="p-6 flex gap-6 flex-wrap">
                <div className="flex-shrink-0">
                  <FifaCard player={selected} onClick={() => {}} />
                </div>
                <div className="flex-1 min-w-[180px] flex flex-col justify-between">
                  <div className="space-y-3 pt-1">
                    {[
                      ['등번호', `#${selected.no}`],
                      ['학년', selected.grade],
                      ['포지션', (selected.positions ?? [selected.pos]).join(' · ')],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/40 text-sm">{k}</span>
                        <span className="text-white font-bold text-sm">{v}</span>
                      </div>
                    ))}
                  </div>
                  {/* 개인 3D 유니폼 이미지 */}
                  {selected.modelPhoto && (
                    <div className="flex justify-center mt-6" style={{ backgroundColor: 'transparent' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.modelPhoto}
                        alt="3D 유니폼"
                        style={{ width: 240, height: 240, objectFit: 'contain', backgroundColor: 'transparent' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 등록 / 수정 폼 */}
            {showForm && (
              <form onSubmit={handleSave} className="p-6 space-y-5">

                {/* 사진 업로드 */}
                <div>
                  <label className={lCls}>선수 사진</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.15)', backgroundColor: '#0e0e0e', cursor: 'pointer' }}
                      onClick={() => fileRef.current?.click()}
                    >
                      {form.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-[10px] text-white/30">클릭</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="px-4 py-2 text-xs font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors block w-full">
                        📷 사진 선택
                      </button>
                      {form.photo && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, photo: '' }))}
                          className="text-xs text-red-500/70 hover:text-red-400 transition-colors block">
                          사진 제거
                        </button>
                      )}
                      <p className="text-[11px] text-white/20">JPG, PNG 권장</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                </div>

                {/* 3D 유니폼 사진 */}
                <div>
                  <label className={lCls}>3D 유니폼 사진</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed rgba(255,255,255,0.15)', backgroundColor: 'transparent', cursor: 'pointer',
                        backgroundImage: 'linear-gradient(45deg,#1a1a1a 25%,transparent 25%,transparent 75%,#1a1a1a 75%),linear-gradient(45deg,#1a1a1a 25%,transparent 25%,transparent 75%,#1a1a1a 75%)',
                        backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}
                      onClick={() => modelFileRef.current?.click()}
                    >
                      {form.modelPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.modelPhoto} alt="3d preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'transparent' }} />
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">👕</div>
                          <div className="text-[10px] text-white/30">클릭</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={() => modelFileRef.current?.click()}
                        className="px-4 py-2 text-xs font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors block w-full">
                        👕 3D 사진 선택
                      </button>
                      {form.modelPhoto && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, modelPhoto: '' }))}
                          className="text-xs text-red-500/70 hover:text-red-400 transition-colors block">
                          사진 제거
                        </button>
                      )}
                      <p className="text-[11px] text-white/20">모델링 이미지 PNG 권장</p>
                    </div>
                    <input ref={modelFileRef} type="file" accept="image/*" className="hidden" onChange={handleModelPhotoChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lCls}>이름 *</label><input required className={iCls} value={form.name} onChange={sf('name')} placeholder="홍길동" /></div>
                  <div><label className={lCls}>등번호 *</label><input required type="number" min="1" max="99" className={iCls} value={form.no} onChange={sf('no')} placeholder="10" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lCls}>학년 *</label>
                    <select required className={sCls} value={form.grade} onChange={sf('grade')}>
                      <option value="3학년">3학년</option>
                    </select>
                  </div>
                  <div>
                    <label className={lCls}>포지션 * <span className="text-white/25 font-normal normal-case">(복수 선택 가능)</span></label>
                    <div className="flex gap-2 mt-1">
                      {ALL_POS.map(p => {
                        const selected = form.positions.includes(p);
                        return (
                          <button
                            key={p} type="button"
                            onClick={() => {
                              setForm(f => {
                                const next = f.positions.includes(p)
                                  ? f.positions.filter(x => x !== p)
                                  : [...f.positions, p];
                                return { ...f, positions: next.length ? next : [p] };
                              });
                            }}
                            className="flex-1 py-2 text-xs font-black transition-all"
                            style={{
                              backgroundColor: selected ? posColors[p] : '#0e0e0e',
                              color: selected ? '#fff' : 'rgba(255,255,255,0.35)',
                              border: `1px solid ${selected ? posColors[p] : 'rgba(255,255,255,0.1)'}`,
                              boxShadow: selected ? `0 0 8px ${posColors[p]}60` : 'none',
                            }}
                          >{p}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 능력치 */}
                <div className="border border-white/10 p-4" style={{ backgroundColor: '#080808' }}>
                  <p className={lCls + ' mb-3'}>능력치 (0–99)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['spd', 'sht', 'pas', 'dri', 'def', 'phy'] as const).map(k => (
                      <div key={k}>
                        <label className={lCls}>{k.toUpperCase()}</label>
                        <input type="number" min="0" max="99" className={iCls} value={form[k]} onChange={sf(k)} placeholder="70" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setEditMode(false); setAddMode(false); }}
                    className="flex-1 py-3 font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors text-sm">
                    취소
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 font-bold text-white hover:opacity-80 transition-opacity text-sm"
                    style={{ backgroundColor: '#CC0000' }}>
                    {addMode ? '등록 완료' : '수정 완료'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 삭제 확인 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
          <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#080808' }}>
            <h3 className="text-white font-black text-lg mb-1">선수 삭제</h3>
            <p className="text-white/50 text-sm mb-6">
              <span className="text-white font-bold">{deleteTarget.name}</span> 선수를 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors text-sm">
                취소
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 font-bold text-white hover:opacity-80 transition-opacity text-sm"
                style={{ backgroundColor: '#dc2626' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {adminModal}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-white/30">로딩 중...</div>}>
      <PlayersContent />
    </Suspense>
  );
}
