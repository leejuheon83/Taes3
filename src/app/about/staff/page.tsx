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

// ── 역할별 색 (프레임 그림은 같고 색만 다르다) ──
const ROLES: Record<string, { cls: string; label: string }> = {
  '감독':       { cls: 'fcard--gold',   label: 'MANAGER' },
  '골키퍼코치': { cls: 'fcard--green',  label: 'GK COACH' },
  '피지컬코치': { cls: 'fcard--purple', label: 'PHYSICAL' },
  '코치':       { cls: 'fcard--blue',   label: 'COACH' },
};
const DEFAULT_ROLE = { cls: '', label: 'STAFF' };

function getRole(role: string) {
  // '골키퍼코치'가 '코치'보다 먼저 걸리도록 긴 이름부터 확인한다
  for (const key of Object.keys(ROLES).sort((x, y) => y.length - x.length)) {
    if (role.includes(key)) return ROLES[key];
  }
  return DEFAULT_ROLE;
}

// ── 스태프 카드 (선수 카드와 같은 프레임, 색만 다름) ──
function StaffCard({ staff, onEdit, onDelete }: {
  staff: Staff; onEdit: () => void; onDelete: () => void;
}) {
  const r = getRole(staff.role);
  const careerLines = staff.career.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
  const shine = (staff.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4) + 1;

  return (
    <div className="relative group">
      <div className={`fcard ${r.cls}`}>
        {/* 사진 */}
        {staff.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="fcard__shot" src={staff.photoURL} alt={staff.name} draggable={false} />
        ) : (
          <div className="fcard__noshot">{staff.name.charAt(0)}</div>
        )}

        {/* 프레임 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fcard__frame" src={frameSrc(r.cls)} alt="" aria-hidden draggable={false} />

        {/* 왼쪽 위: 역할 */}
        <div className="fcard__ovr">
          <span className="fcard__ovr-n is-word">{staff.role}</span>
          <span className={`fcard__ovr-pos${r.label.length > 5 ? ' is-long' : ''}`}>{r.label}</span>
        </div>

        {/* 이름 */}
        <h3 className={`fcard__name${staff.name.length > 4 ? ' is-long' : ''}`}>{staff.name}</h3>

        {/* 시즌 판 (선수 카드의 등번호 자리) */}
        <div className="fcard__num">
          <div className="fcard__num-in">
            <i className="fcard__num-d" aria-hidden />
            <span className="fcard__num-lab">SEASON</span>
            <b className="fcard__num-n">2026</b>
            <i className="fcard__num-d" aria-hidden />
          </div>
        </div>

        {/* 능력치 칸 자리에 경력 — 칸 두 줄에 정확히 맞춘다 */}
        {careerLines.length === 1 ? (
          <>
            <div className="fcard__note" style={{ top: '64%', height: '9.4%' }}>
              <span className="fcard__note-lab" style={{ margin: 0 }}>CAREER</span>
            </div>
            <div className="fcard__note" style={{ top: '75.8%', height: '9.4%' }}>
              <div>{careerLines[0]}</div>
            </div>
          </>
        ) : careerLines.length > 1 && (
          <div className="fcard__note" style={{ top: '64%', height: '21.2%' }}>
            <div>
              <span className="fcard__note-lab">CAREER</span>
              {careerLines.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}

        {/* 프레임을 따라 흐르는 빛 */}
        <div className={`fcard__shine d${shine}`} aria-hidden />
      </div>

      {/* ── 수정/삭제 버튼 ── */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <button onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}>
          ✏
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold transition-all"
          style={{ backgroundColor: 'rgba(180,0,0,0.85)', borderRadius: 4, border: '1px solid rgba(255,100,100,0.4)', color: '#fff' }}>
          ✕
        </button>
      </div>
    </div>
  );
}

function frameSrc(cls: string) {
  const name = cls.replace('fcard--', '');
  return name ? `/card-frame-${name}.webp` : '/card-frame.webp';
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
            <div className="section-eyebrow mb-2">COACHING STAFF</div>
            <h1 className="text-4xl section-title mb-2">코칭 스태프</h1>
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
              <h2 className="section-title text-lg">{editTarget ? '스태프 수정' : '스태프 등록'}</h2>
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
