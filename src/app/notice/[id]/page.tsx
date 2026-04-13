'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Notice } from '../page';

const STORAGE_KEY = 'taes-notices-v1';
const CAT_COLORS: Record<string, string> = {
  중요: '#dc2626', 훈련: '#2563eb', 행사: '#16a34a', 대회: '#ca8a04', 공지: '#6b7280',
};
const CATEGORIES = ['중요', '훈련', '행사', '대회', '공지'];

function loadNotices(): Notice[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveNotices(list: Notice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ category: '', title: '', content: '', author: '', pinned: false });

  useEffect(() => {
    const list = loadNotices();
    setNotices(list);
    const found = list.find(n => n.id === id);
    if (found) {
      // increment views
      const updated = list.map(n => n.id === id ? { ...n, views: n.views + 1 } : n);
      saveNotices(updated);
      setNotices(updated);
      setNotice({ ...found, views: found.views + 1 });
      setForm({ category: found.category, title: found.title, content: found.content, author: found.author, pinned: found.pinned });
    }
  }, [id]);

  function handleSave() {
    if (!form.title.trim() || !form.author.trim()) return;
    const updated = notices.map(n => n.id === id ? { ...n, ...form } : n);
    saveNotices(updated);
    setNotices(updated);
    const updatedNotice = updated.find(n => n.id === id) ?? null;
    setNotice(updatedNotice);
    setEditing(false);
  }

  function handleDelete() {
    if (!confirm('이 공지를 삭제할까요?')) return;
    const updated = notices.filter(n => n.id !== id);
    saveNotices(updated);
    router.push('/notice');
  }

  if (!notice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/30">
        <div className="text-center">
          <div className="text-5xl mb-3">📋</div>
          <div>공지를 찾을 수 없습니다.</div>
          <Link href="/notice" className="text-red-500 text-sm mt-3 inline-block hover:underline">← 목록으로</Link>
        </div>
      </div>
    );
  }

  const idx = notices.findIndex(n => n.id === id);
  const prev = idx > 0 ? notices[idx - 1] : null;
  const next = idx < notices.length - 1 ? notices[idx + 1] : null;

  return (
    <div className="min-h-screen">
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>NOTICE</div>
          <h1 className="text-3xl font-black text-white">공지사항</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {!editing ? (
          <>
            {/* 상세 헤더 */}
            <div className="border border-white/10 p-6 mb-6" style={{ backgroundColor: '#111' }}>
              <div className="flex items-center gap-3 mb-3">
                {notice.pinned && <span className="text-xs font-black px-2 py-0.5 text-white" style={{ backgroundColor: '#CC0000' }}>📌 고정</span>}
                <span className="text-xs font-bold px-2 py-0.5 text-white" style={{ backgroundColor: CAT_COLORS[notice.category] || '#6b7280' }}>{notice.category}</span>
              </div>
              <h2 className="text-xl font-black text-white mb-4 leading-snug">{notice.title}</h2>
              <div className="flex flex-wrap gap-4 text-xs text-white/40 border-t border-white/10 pt-4">
                <span>✍️ {notice.author}</span>
                <span>📅 {notice.date}</span>
                <span>👁 {notice.views}회</span>
              </div>
            </div>

            {/* 본문 */}
            <div className="border border-white/10 p-6 mb-6 min-h-[200px]" style={{ backgroundColor: '#0f0f0f' }}>
              {notice.content ? (
                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{notice.content}</div>
              ) : (
                <div className="text-white/20 text-sm">내용이 없습니다.</div>
              )}
            </div>

            {/* 수정/삭제 버튼 */}
            <div className="flex justify-end gap-2 mb-8">
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2 text-sm font-bold text-white/60 border border-white/10 hover:border-white/30 hover:text-white transition-colors"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 text-sm font-bold text-white hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#dc2626' }}
              >
                삭제
              </button>
            </div>

            {/* 이전/다음 */}
            <div className="border border-white/10 divide-y divide-white/10" style={{ backgroundColor: '#111' }}>
              {next && (
                <Link href={`/notice/${next.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                  <span className="text-xs text-white/30 w-10 flex-shrink-0">다음</span>
                  <span className="text-sm text-white/70 hover:text-white truncate">{next.title}</span>
                </Link>
              )}
              {prev && (
                <Link href={`/notice/${prev.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                  <span className="text-xs text-white/30 w-10 flex-shrink-0">이전</span>
                  <span className="text-sm text-white/70 hover:text-white truncate">{prev.title}</span>
                </Link>
              )}
            </div>

            {/* 목록 버튼 */}
            <div className="mt-6">
              <Link href="/notice" className="px-6 py-2.5 text-sm font-bold text-white/60 border border-white/10 hover:border-white/30 hover:text-white transition-colors inline-block">
                ← 목록
              </Link>
            </div>
          </>
        ) : (
          /* 수정 폼 */
          <div className="border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
            <h2 className="text-lg font-black text-white mb-6">공지 수정</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1">분류</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 text-white text-sm border border-white/10 outline-none" style={{ backgroundColor: '#1a1a1a' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1">작성자</label>
                  <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none" style={{ backgroundColor: '#1a1a1a' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">제목</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none" style={{ backgroundColor: '#1a1a1a' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">내용</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none resize-none" style={{ backgroundColor: '#1a1a1a' }} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="w-4 h-4 accent-red-600" />
                <span className="text-sm text-white/60">📌 상단 고정</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button onClick={handleSave} disabled={!form.title.trim() || !form.author.trim()} className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-30 transition-colors" style={{ backgroundColor: '#CC0000' }}>저장</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
