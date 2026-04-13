'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/AdminAuth';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, orderBy, query
} from 'firebase/firestore';

export type Notice = {
  id: string;
  category: string;
  title: string;
  content: string;
  date: string;
  author: string;
  views: number;
  pinned: boolean;
};

const CATEGORIES = ['전체', '중요', '훈련', '행사', '대회', '공지'];
const CAT_COLORS: Record<string, string> = {
  중요: '#dc2626', 훈련: '#2563eb', 행사: '#16a34a', 대회: '#ca8a04', 공지: '#6b7280',
};
const PAGE_SIZE = 10;

export async function getNoticesFromFirestore(): Promise<Notice[]> {
  const q = query(collection(db, 'notices'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Notice, 'id'>) }));
}

const emptyForm = { category: '공지', title: '', content: '', author: '', pinned: false };

export default function NoticePage() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [showWrite, setShowWrite] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadNotices() {
      setLoading(true);
      try {
        const loaded = await getNoticesFromFirestore();
        setNotices(loaded);
        // Update last seen badge
        if (loaded.length) {
          const maxId = loaded[0].id;
          localStorage.setItem('taes-notice-last-seen', String(maxId));
        }
      } catch (err) {
        console.error('Failed to load notices:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotices();
  }, []);

  async function handleSubmit() {
    if (!form.title.trim() || !form.author.trim()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      const id = String(Date.now());
      const notice: Notice = {
        id,
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        author: form.author.trim(),
        date: today,
        views: 0,
      };
      await setDoc(doc(db, 'notices', id), {
        category: notice.category,
        title: notice.title,
        content: notice.content,
        date: notice.date,
        author: notice.author,
        views: 0,
        pinned: notice.pinned,
      });
      setNotices(prev => [notice, ...prev]);
      setShowWrite(false);
      setForm(emptyForm);
      setPage(1);
    } catch (err) {
      console.error('Failed to save notice:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = notices.filter(n => {
    const matchCat = activeCategory === '전체' || n.category === activeCategory;
    const matchSearch = n.title.includes(searchQuery) || n.author.includes(searchQuery);
    return matchCat && matchSearch;
  });

  const pinned = filtered.filter(n => n.pinned);
  const normal = filtered.filter(n => !n.pinned);
  const totalPages = Math.max(1, Math.ceil(normal.length / PAGE_SIZE));
  const paginated = normal.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #050505 0%, #1a0000 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>NOTICE</div>
          <h1 className="text-4xl font-black text-white mb-2">공지사항</h1>
          <p className="text-white/40 text-sm">TAES FC 프리미어의 새로운 소식을 확인하세요.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setPage(1); }}
                className="px-4 py-2 text-sm font-bold transition-colors"
                style={{
                  backgroundColor: activeCategory === cat ? '#CC0000' : '#0e0e0e',
                  color: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${activeCategory === cat ? '#CC0000' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="sm:ml-auto px-4 py-2 text-sm text-white bg-[#0e0e0e] border border-white/10 focus:border-red-700 outline-none w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/30">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-pulse">📋</div>
              <div>로딩 중...</div>
            </div>
          </div>
        ) : (
          <>
            {/* 공지 없을 때 */}
            {filtered.length === 0 && (
              <div className="py-20 text-center text-white/20">
                <div className="text-5xl mb-3">📋</div>
                <div className="font-bold">등록된 공지가 없습니다</div>
              </div>
            )}

            {/* 고정 공지 */}
            {pinned.length > 0 && (
              <div className="mb-2">
                {pinned.map(n => (
                  <Link
                    key={n.id}
                    href={`/notice/${n.id}`}
                    className="flex items-center gap-4 py-4 px-5 mb-1 border-l-4 transition-all group"
                    style={{ backgroundColor: '#1a0000', borderLeftColor: '#CC0000', border: '1px solid rgba(204,0,0,0.2)', borderLeft: '4px solid #CC0000' }}
                  >
                    <span className="text-xs font-black px-2 py-0.5 text-white flex-shrink-0" style={{ backgroundColor: '#CC0000' }}>📌 고정</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 text-white flex-shrink-0" style={{ backgroundColor: CAT_COLORS[n.category] || '#6b7280' }}>{n.category}</span>
                    <span className="flex-1 text-white font-semibold text-sm truncate group-hover:text-red-400 transition-colors">{n.title}</span>
                    <div className="flex gap-4 text-xs text-white/30 flex-shrink-0">
                      <span>👁 {n.views}</span>
                      <span>{n.date}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 일반 공지 테이블 */}
            {normal.length > 0 && (
              <div className="border border-white/10">
                <div className="grid grid-cols-12 py-3 px-5 text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/10" style={{ backgroundColor: '#080808' }}>
                  <div className="col-span-1">번호</div>
                  <div className="col-span-2">분류</div>
                  <div className="col-span-6">제목</div>
                  <div className="col-span-1 text-center">작성자</div>
                  <div className="col-span-1 text-center">날짜</div>
                  <div className="col-span-1 text-center">조회</div>
                </div>
                {paginated.map((n, idx) => (
                  <Link
                    key={n.id}
                    href={`/notice/${n.id}`}
                    className="grid grid-cols-12 py-4 px-5 border-b border-white/5 hover:bg-white/5 transition-colors group"
                    style={{ backgroundColor: '#080808' }}
                  >
                    <div className="col-span-1 text-white/30 text-sm">{normal.length - ((page - 1) * PAGE_SIZE + idx)}</div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 text-white" style={{ backgroundColor: CAT_COLORS[n.category] || '#6b7280' }}>{n.category}</span>
                    </div>
                    <div className="col-span-6 text-white/80 group-hover:text-white text-sm font-medium transition-colors truncate pr-4">{n.title}</div>
                    <div className="col-span-1 text-center text-white/40 text-xs">{n.author}</div>
                    <div className="col-span-1 text-center text-white/40 text-xs">{n.date.slice(5)}</div>
                    <div className="col-span-1 text-center text-white/40 text-xs">{n.views}</div>
                  </Link>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-9 h-9 text-sm font-bold transition-colors"
                    style={{
                      backgroundColor: p === page ? '#CC0000' : '#0e0e0e',
                      color: p === page ? '#fff' : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${p === page ? '#CC0000' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 글쓰기 버튼 */}
        <div className="flex justify-end mt-6">
          <button
            onClick={() => requireAdmin(() => setShowWrite(true))}
            className="px-6 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-colors"
            style={{ backgroundColor: '#CC0000' }}
          >
            + 글쓰기
          </button>
        </div>
      </div>

      {/* ── 글쓰기 모달 ── */}
      {showWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-lg p-6 border border-white/10 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#080808' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">공지 작성</h2>
              <button onClick={() => { setShowWrite(false); setForm(emptyForm); }} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1">분류</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-white text-sm border border-white/10 outline-none"
                    style={{ backgroundColor: '#0e0e0e' }}
                  >
                    {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1">작성자 *</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                    placeholder="이름"
                    className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                    style={{ backgroundColor: '#0e0e0e' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="공지 제목"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">내용</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="공지 내용을 입력하세요"
                  rows={6}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none resize-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="w-4 h-4 accent-red-600"
                />
                <span className="text-sm text-white/60">📌 상단 고정</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowWrite(false); setForm(emptyForm); }}
                className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || !form.author.trim() || saving}
                className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-30 transition-colors"
                style={{ backgroundColor: '#CC0000' }}
              >
                {saving ? '저장 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
      {adminModal}
    </div>
  );
}
