'use client';

import { useState, useEffect, useRef } from 'react';

type Staff = {
  id: number;
  name: string;
  role: string;
  career: string;
  photo?: string;
};

const STORAGE_KEY = 'taes-staff-v1';

function load(): Staff[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function save(list: Staff[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

const emptyForm = { name: '', role: '', career: '', photo: '' };

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setStaff(load()); }, []);

  function persist(next: Staff[]) { setStaff(next); save(next); }

  function openAdd() { setForm(emptyForm); setEditingId(null); setShowForm(true); }
  function openEdit(s: Staff) { setForm({ name: s.name, role: s.role, career: s.career, photo: s.photo ?? '' }); setEditingId(s.id); setShowForm(true); }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.role.trim()) return;
    if (editingId !== null) {
      persist(staff.map(s => s.id === editingId ? { ...s, ...form } : s));
    } else {
      persist([...staff, { id: Date.now(), ...form }]);
    }
    setShowForm(false);
    setForm(emptyForm);
  }

  function handleDelete(id: number) {
    if (!confirm('삭제할까요?')) return;
    persist(staff.filter(s => s.id !== id));
  }

  return (
    <div className="min-h-screen">
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>STAFF</div>
          <h1 className="text-4xl font-black text-white mb-2">코칭스태프</h1>
          <p className="text-white/40 text-sm">TAES FC 프리미어 코치진을 소개합니다.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-end mb-8">
          <button
            onClick={openAdd}
            className="px-6 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-colors"
            style={{ backgroundColor: '#CC0000' }}
          >
            + 스태프 등록
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <div className="text-6xl mb-4">👤</div>
            <div className="text-lg font-bold mb-1">등록된 스태프가 없습니다</div>
            <div className="text-sm">+ 스태프 등록 버튼으로 추가하세요</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map(s => (
              <div key={s.id} className="relative group border border-white/10 hover:border-red-800/50 transition-all" style={{ backgroundColor: '#111' }}>
                {/* 사진 */}
                <div className="aspect-[4/3] flex items-center justify-center overflow-hidden border-b border-white/10" style={{ backgroundColor: '#1a1a1a' }}>
                  {s.photo ? (
                    <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-white/20">
                      <div className="text-5xl mb-2">👤</div>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs font-bold mb-1" style={{ color: '#CC0000' }}>{s.role}</div>
                  <div className="text-white font-black text-lg mb-3">{s.name}</div>
                  {s.career && (
                    <div className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap">{s.career}</div>
                  )}
                </div>
                {/* 수정/삭제 */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(s)}
                    className="w-7 h-7 rounded bg-black/70 text-white/70 hover:text-white hover:bg-blue-800 text-xs flex items-center justify-center"
                  >
                    ✏
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="w-7 h-7 rounded bg-black/70 text-white/70 hover:text-white hover:bg-red-800 text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 등록/수정 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md p-6 border border-white/10 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#111' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">{editingId ? '스태프 수정' : '스태프 등록'}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            {/* 사진 업로드 */}
            <div className="flex flex-col items-center mb-5">
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 flex items-center justify-center mb-3 cursor-pointer hover:border-red-600 transition-colors"
                style={{ backgroundColor: '#1a1a1a' }}
                onClick={() => photoRef.current?.click()}
              >
                {form.photo ? (
                  <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-white/20">👤</span>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <button onClick={() => photoRef.current?.click()} className="text-xs text-white/40 hover:text-white transition-colors">사진 선택</button>
              {form.photo && <button onClick={() => setForm(f => ({ ...f, photo: '' }))} className="text-xs text-white/30 hover:text-red-400 mt-1 transition-colors">사진 제거</button>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">역할 *</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="예: 감독, 코치, 골키퍼 코치"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="성함"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">경력 (선택)</label>
                <textarea
                  value={form.career}
                  onChange={e => setForm(f => ({ ...f, career: e.target.value }))}
                  placeholder="예: 前 ○○FC 코치&#10;AFC C급 라이선스 보유"
                  rows={4}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none resize-none"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || !form.role.trim()}
                className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-30 transition-colors"
                style={{ backgroundColor: '#CC0000' }}
              >
                {editingId ? '저장' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
