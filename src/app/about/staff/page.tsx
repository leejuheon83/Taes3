'use client';

import { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query } from 'firebase/firestore';

// ── 이미지 압축 ──
function compressImage(file: File, maxDim = 500, quality = 0.85): Promise<string> {
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
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(file.type === 'image/png'
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}

type Staff = {
  id: string;
  name: string;
  role: string;
  career: string;
  order: number;
  photoURL: string | null;
};

const THEMES: Record<string, { bg: string; glow: string; accent: string; border1: string; border2: string; label: string }> = {
  '감독': {
    bg: 'linear-gradient(170deg,#0d0800 0%,#1c1000 35%,#100800 65%,#030303 100%)',
    glow: '#f5b800', accent: '#ffe066', border1: '#ffe066', border2: '#a86800',
    label: 'MANAGER',
  },
  '코치': {
    bg: 'linear-gradient(170deg,#00050f 0%,#000b1c 35%,#000810 65%,#030303 100%)',
    glow: '#3b82f6', accent: '#93c5fd', border1: '#93c5fd', border2: '#1d4ed8',
    label: 'COACH',
  },
  '골키퍼코치': {
    bg: 'linear-gradient(170deg,#00090a 0%,#001510 35%,#000d08 65%,#030303 100%)',
    glow: '#22c55e', accent: '#86efac', border1: '#86efac', border2: '#15803d',
    label: 'GK COACH',
  },
  '피지컬코치': {
    bg: 'linear-gradient(170deg,#080008 0%,#120010 35%,#090006 65%,#030303 100%)',
    glow: '#c026d3', accent: '#e879f9', border1: '#e879f9', border2: '#86198f',
    label: 'PHYSICAL',
  },
};
const DEFAULT_THEME = {
  bg: 'linear-gradient(170deg,#0a0000 0%,#1a0000 35%,#0a0000 65%,#030303 100%)',
  glow: '#ef4444', accent: '#fca5a5', border1: '#fca5a5', border2: '#991b1b',
  label: 'STAFF',
};

function getTheme(role: string) {
  for (const key of Object.keys(THEMES)) {
    if (role.includes(key)) return THEMES[key];
  }
  return DEFAULT_THEME;
}

// ── 스태프 카드 ──
function StaffCard({ staff, onEdit, onDelete }: {
  staff: Staff; onEdit: () => void; onDelete: () => void;
}) {
  const t = getTheme(staff.role);
  const initial = staff.name.charAt(0);

  return (
    <div className="relative group" style={{ perspective: '1000px' }}>
      <div
        className="relative overflow-hidden transition-all duration-400 group-hover:scale-[1.04] group-hover:-translate-y-1"
        style={{
          aspectRatio: '3/4.2',
          borderRadius: '16px',
          background: t.bg,
          boxShadow: `0 2px 0 ${t.border2}, 0 12px 50px rgba(0,0,0,0.95), 0 0 60px ${t.glow}25, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        {/* ── 외곽 메탈릭 테두리 (3px 두께) ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '16px', zIndex: 25, pointerEvents: 'none',
          background: `linear-gradient(145deg, ${t.accent} 0%, rgba(255,255,255,0.6) 20%, ${t.border2} 45%, ${t.accent}90 65%, rgba(255,255,255,0.3) 80%, ${t.border2} 100%)`,
          padding: '1.5px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude',
        }} />

        {/* ── 내부 얇은 내선 ── */}
        <div style={{
          position: 'absolute', inset: 4, borderRadius: '13px', zIndex: 24, pointerEvents: 'none',
          border: `1px solid ${t.accent}30`,
        }} />

        {/* ── 상단 컬러 바 ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 26,
          background: `linear-gradient(90deg, transparent 0%, ${t.border2} 15%, ${t.accent} 40%, #fff 50%, ${t.accent} 60%, ${t.border2} 85%, transparent 100%)`,
          borderRadius: '16px 16px 0 0',
        }} />

        {/* ── 대각 스트라이프 (은은하게) ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '16px',
          backgroundImage: `repeating-linear-gradient(55deg, ${t.glow}08 0px, ${t.glow}08 1px, transparent 1px, transparent 14px)`,
        }} />

        {/* ── 원형 레이더 SVG ── */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          <defs>
            <radialGradient id={`rg-${staff.id}`} cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor={t.glow} stopOpacity="0.25" />
              <stop offset="60%" stopColor={t.glow} stopOpacity="0.06" />
              <stop offset="100%" stopColor={t.glow} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="50%" cy="40%" rx="90%" ry="70%" fill={`url(#rg-${staff.id})`} />
          {[38, 62, 88].map(r => (
            <circle key={r} cx="50%" cy="40%" r={`${r}%`} fill="none" stroke={t.glow} strokeWidth="0.5" opacity="0.12" />
          ))}
          {Array.from({ length: 8 }, (_, i) => i * 45).map(deg => {
            const rad = (deg * Math.PI) / 180;
            return <line key={deg} x1="50%" y1="40%"
              x2={`calc(50% + ${160 * Math.cos(rad)}px)`}
              y2={`calc(40% + ${160 * Math.sin(rad)}px)`}
              stroke={t.glow} strokeWidth="0.4" opacity="0.08" />;
          })}
          {/* 코너 장식 ✦ */}
          {[{ x: '12%', y: '8%', s: 7 }, { x: '88%', y: '8%', s: 5 }, { x: '10%', y: '92%', s: 4 }, { x: '90%', y: '92%', s: 4 }].map((p, i) => (
            <text key={i} x={p.x} y={p.y} fontSize={p.s * 2} fill={t.accent} opacity="0.5" textAnchor="middle" dominantBaseline="middle">✦</text>
          ))}
        </svg>

        {/* ── 상단: 역할 + TAES ── */}
        <div style={{ position: 'relative', zIndex: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 13px 0' }}>
          <div style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.15em', color: t.accent,
            textShadow: `0 0 10px ${t.glow}`, padding: '2px 7px',
            background: `${t.glow}18`, borderRadius: 3,
            border: `1px solid ${t.glow}30`,
          }}>{t.label}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: t.accent, letterSpacing: '0.15em', lineHeight: 1 }}>TAES</div>
            <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>FC</div>
          </div>
        </div>

        {/* ── 사진 영역 ── */}
        <div style={{
          position: 'absolute', bottom: '22%', left: '50%',
          transform: 'translateX(-50%)',
          width: '92%', height: '58%',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 10,
        }}>
          {staff.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={staff.photoURL} alt={staff.name} style={{
              maxHeight: '100%', maxWidth: '90%', objectFit: 'contain',
              filter: `drop-shadow(0 6px 20px ${t.glow}60) drop-shadow(0 2px 6px rgba(0,0,0,0.9))`,
            }} />
          ) : (
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${t.accent}40, ${t.glow}18 50%, transparent 80%)`,
              border: `2px solid ${t.accent}60`,
              boxShadow: `0 0 24px ${t.glow}40, inset 0 1px 0 ${t.accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34, fontWeight: 900, color: t.accent,
              textShadow: `0 0 20px ${t.glow}, 0 2px 8px rgba(0,0,0,0.8)`,
            }}>{initial}</div>
          )}
        </div>

        {/* ── 하단 정보 패널 ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
          background: `linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.88) 60%, transparent 100%)`,
          padding: '28px 12px 12px',
          borderRadius: '0 0 16px 16px',
        }}>
          {/* 골든 구분선 */}
          <div style={{
            height: 1, marginBottom: 9,
            background: `linear-gradient(90deg, transparent 0%, ${t.border2} 10%, ${t.accent} 35%, #fff 50%, ${t.accent} 65%, ${t.border2} 90%, transparent 100%)`,
            boxShadow: `0 0 8px ${t.glow}60`,
          }} />

          {/* 이름 */}
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{
              fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '0.06em',
              textShadow: `0 0 20px ${t.glow}80, 0 1px 4px rgba(0,0,0,0.9)`,
            }}>{staff.name}</div>
          </div>

          {/* 경력 */}
          {staff.career && (
            <div style={{ borderTop: `1px solid ${t.glow}18`, paddingTop: 7, marginTop: 3 }}>
              {staff.career.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{
                  fontSize: 9, color: `${t.accent}90`, textAlign: 'center',
                  lineHeight: 1.8, letterSpacing: '0.03em',
                }}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── 호버 시 광택 오버레이 ── */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${t.accent}12 0%, transparent 40%, ${t.accent}06 100%)`,
        }} />
      </div>

      {/* ── 수정/삭제 버튼 ── */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <button onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 4, border: `1px solid ${t.accent}50`, color: t.accent }}>
          ✏
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold transition-all"
          style={{ backgroundColor: 'rgba(180,0,0,0.8)', borderRadius: 4, border: '1px solid rgba(255,100,100,0.4)', color: '#fff' }}>
          ✕
        </button>
      </div>
    </div>
  );
}

const emptyForm = { name: '', role: '감독', career: '', photo: '', photoCleared: false };

export default function StaffPage() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'staff'), orderBy('order'));
        const snap = await getDocs(q);
        const loaded: Staff[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Staff, 'id'>),
        }));
        setStaffList(loaded);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const openAdd = () => requireAdmin(() => {
    setForm(emptyForm); setEditTarget(null); setShowForm(true);
  });

  const openEdit = (s: Staff) => requireAdmin(() => {
    setForm({ name: s.name, role: s.role, career: s.career, photo: s.photoURL ?? '', photoCleared: false });
    setEditTarget(s); setShowForm(true);
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 500, 0.85);
    setForm(f => ({ ...f, photo: compressed, photoCleared: false }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim()) return;
    setSaving(true);
    try {
      const id = editTarget ? editTarget.id : String(Date.now());
      let photoURL: string | null = null;
      if (form.photoCleared) { photoURL = null; }
      else if (form.photo) { photoURL = form.photo; }
      else if (editTarget) { photoURL = editTarget.photoURL; }

      const data: Omit<Staff, 'id'> = {
        name: form.name.trim(),
        role: form.role.trim(),
        career: form.career.trim(),
        order: editTarget ? editTarget.order : Date.now(),
        photoURL,
      };
      await setDoc(doc(db, 'staff', id), data);
      const updated: Staff = { id, ...data };
      if (editTarget) {
        setStaffList(prev => prev.map(s => s.id === id ? updated : s));
      } else {
        setStaffList(prev => [...prev, updated]);
      }
      setShowForm(false);
    } catch (e) { console.error(e); alert('저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'staff', deleteTarget.id));
      setStaffList(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert('삭제에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #050505 0%, #1a0000 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-end justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>COACHING STAFF</div>
            <h1 className="text-4xl font-black text-white mb-2">코칭 스태프</h1>
            <p className="text-white/40 text-sm">TAES FC PREMIER 코치진을 소개합니다</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 font-bold text-white text-sm hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#CC0000' }}>
            + 스태프 등록
          </button>
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse rounded-xl" style={{ height: 320, backgroundColor: '#111' }} />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-24 text-center text-white/20 border border-white/5" style={{ backgroundColor: '#080808' }}>
            <div className="text-6xl mb-4">👤</div>
            <div className="text-lg font-bold mb-2">등록된 스태프가 없습니다</div>
            <div className="text-sm">+ 스태프 등록 버튼으로 추가하세요</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {staffList.map(s => (
              <StaffCard
                key={s.id}
                staff={s}
                onEdit={() => openEdit(s)}
                onDelete={() => requireAdmin(() => setDeleteTarget(s))}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 등록/수정 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-md border border-white/10 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-black text-white text-lg">{editTarget ? '스태프 수정' : '스태프 등록'}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white text-2xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* 사진 */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#1a1a1a', border: '2px dashed rgba(255,255,255,0.15)' }}
                  onClick={() => photoRef.current?.click()}
                >
                  {form.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl text-white/20">👤</div>
                      <div className="text-[10px] text-white/30 mt-1">클릭</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 text-xs">
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className="px-3 py-1.5 font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors">
                    📷 사진 선택
                  </button>
                  {form.photo && (
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, photo: '', photoCleared: true }))}
                      className="px-3 py-1.5 font-bold text-red-500/70 hover:text-red-400 border border-red-900/30 transition-colors">
                      제거
                    </button>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              {/* 역할 */}
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">역할 *</label>
                <div className="flex gap-2 flex-wrap">
                  {['감독', '코치', '골키퍼코치', '피지컬코치', '트레이너'].map(r => (
                    <button key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r }))}
                      className="px-3 py-1.5 text-xs font-bold transition-all"
                      style={{
                        backgroundColor: form.role === r ? '#CC0000' : '#1a1a1a',
                        color: form.role === r ? '#fff' : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${form.role === r ? '#CC0000' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="직접 입력 가능"
                  className="w-full mt-2 px-3 py-2 text-white text-sm border border-white/10 focus:border-red-700 outline-none"
                  style={{ backgroundColor: '#111' }}
                />
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="성함"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-700 outline-none"
                  style={{ backgroundColor: '#111' }}
                />
              </div>

              {/* 경력 */}
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">경력 (선택)</label>
                <textarea
                  value={form.career}
                  onChange={e => setForm(f => ({ ...f, career: e.target.value }))}
                  placeholder={'前 ○○FC 코치\nAFC C급 라이선스 보유'}
                  rows={4}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-700 outline-none resize-none"
                  style={{ backgroundColor: '#111' }}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors text-sm">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || !form.role.trim()}
                  className="flex-1 py-3 font-bold text-white hover:opacity-80 transition-opacity text-sm disabled:opacity-40"
                  style={{ backgroundColor: '#CC0000' }}>
                  {saving ? '저장 중...' : editTarget ? '수정 완료' : '등록 완료'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 삭제 확인 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
          <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#080808' }}>
            <h3 className="text-white font-black text-lg mb-1">스태프 삭제</h3>
            <p className="text-white/50 text-sm mb-6">
              <span className="text-white font-bold">{deleteTarget.name}</span> 스태프를 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors text-sm">
                취소
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-2.5 font-bold text-white hover:opacity-80 transition-opacity text-sm disabled:opacity-50"
                style={{ backgroundColor: '#dc2626' }}>
                {saving ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adminModal}
    </div>
  );
}
