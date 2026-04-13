'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { useRouter } from 'next/navigation';

const USER_AUTH_KEY = 'taes-user-login';

type VideoType = 'upload' | 'youtube';
type VideoMeta = {
  id: number;
  title: string;
  date: string;
  grade: string;
  description: string;
  type: VideoType;
  youtubeId?: string;
  filename?: string;
  duration?: string;
};

const META_KEY = 'taes-videos-v1';
const FEATURED_VIDEO_KEY = 'taes-featured-video';

// ── IndexedDB helpers ──
const DB_NAME = 'taes-video-blobs';
const STORE = 'blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveBlob(id: number, blob: Blob) {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function loadBlobURL(id: number): Promise<string | null> {
  const db = await openDB();
  return new Promise(res => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => res(req.result ? URL.createObjectURL(req.result) : null);
    req.onerror = () => res(null);
  });
}
async function deleteBlob(id: number) {
  const db = await openDB();
  return new Promise<void>(res => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
  });
}

function loadMeta(): VideoMeta[] {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? '[]'); } catch { return []; }
}
function saveMeta(list: VideoMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(list));
}

function extractYoutubeId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? '';
}

function YoutubeThumb({ yid, title }: { yid: string; title: string }) {
  return (
    <img
      src={`https://img.youtube.com/vi/${yid}/hqdefault.jpg`}
      alt={title}
      className="w-full h-full object-cover"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function VideoThumb({ id, filename }: { id: number; filename?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { loadBlobURL(id).then(setSrc); }, [id]);
  if (!src) return <div className="w-full h-full flex items-center justify-center text-white/10 text-4xl">🎬</div>;
  return <video src={src} className="w-full h-full object-cover" muted />;
}

export default function VideosPage() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const router = useRouter();
  const [metas, setMetas] = useState<VideoMeta[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playingSrc, setPlayingSrc] = useState<string | null>(null);
  const [featuredVideoId, setFeaturedVideoId] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // 업로드 모달
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<VideoType>('upload');
  const [form, setForm] = useState({ title: '', date: new Date().toISOString().slice(0,10).replace(/-/g,'.'), description: '', youtubeUrl: '' });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem(USER_AUTH_KEY) !== '1') {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
    setMetas(loadMeta());
    try {
      const raw = localStorage.getItem(FEATURED_VIDEO_KEY);
      if (raw) setFeaturedVideoId(JSON.parse(raw).id);
    } catch {}
  }, [router]);

  if (!authChecked) return null;

  const filtered = metas;
  const featured = filtered[0] ?? null;

  async function handlePlay(meta: VideoMeta) {
    if (meta.type === 'youtube') {
      setPlayingId(meta.id);
      setPlayingSrc(null);
      return;
    }
    const url = await loadBlobURL(meta.id);
    if (!url) { alert('영상 파일을 찾을 수 없습니다. 다시 업로드해 주세요.'); return; }
    setPlayingId(meta.id);
    setPlayingSrc(url);
  }

  function handleClosePlayer() {
    setPlayingId(null);
    setPlayingSrc(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('영상을 삭제할까요?')) return;
    const next = metas.filter(m => m.id !== id);
    setMetas(next);
    saveMeta(next);
    await deleteBlob(id);
    if (playingId === id) handleClosePlayer();
  }

  function handleSetFeaturedVideo(meta: VideoMeta) {
    try {
      localStorage.setItem(FEATURED_VIDEO_KEY, JSON.stringify(meta));
      setFeaturedVideoId(meta.id);
    } catch {
      alert('설정 저장에 실패했습니다.');
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    if (uploadType === 'youtube') {
      const yid = extractYoutubeId(form.youtubeUrl);
      if (!yid) { alert('올바른 YouTube URL을 입력해 주세요.'); return; }
      const meta: VideoMeta = { id: Date.now(), title: form.title.trim(), date: form.date, grade: '', description: form.description, type: 'youtube', youtubeId: yid };
      const next = [meta, ...metas];
      setMetas(next); saveMeta(next);
    } else {
      if (!videoFile) { alert('영상 파일을 선택해 주세요.'); return; }
      setUploading(true);
      const id = Date.now();
      await saveBlob(id, videoFile);
      const meta: VideoMeta = { id, title: form.title.trim(), date: form.date, grade: '', description: form.description, type: 'upload', filename: videoFile.name };
      const next = [meta, ...metas];
      setMetas(next); saveMeta(next);
      setUploading(false);
    }
    setShowUpload(false);
    setForm({ title: '', date: new Date().toISOString().slice(0,10).replace(/-/g,'.'), description: '', youtubeUrl: '' });
    setVideoFile(null);
  }

  const playingMeta = metas.find(m => m.id === playingId) ?? null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #050505 0%, #1a0000 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>VIDEOS</div>
          <h1 className="text-4xl font-black text-white mb-2">경기/훈련 영상</h1>
          <p className="text-white/40 text-sm">경기 하이라이트 및 훈련 영상을 공유해 주세요.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Featured player */}
        {featured ? (
          <div className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div
                className="aspect-video flex items-center justify-center relative overflow-hidden border border-white/10 cursor-pointer group"
                style={{ backgroundColor: '#080808' }}
                onClick={() => handlePlay(featured)}
              >
                {featured.type === 'youtube' ? (
                  <YoutubeThumb yid={featured.youtubeId!} title={featured.title} />
                ) : (
                  <VideoThumb id={featured.id} filename={featured.filename} />
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                <button className="absolute z-10 w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl transition-transform hover:scale-110" style={{ backgroundColor: 'rgba(204,0,0,0.9)' }}>▶</button>
                {featured.duration && (
                  <div className="absolute bottom-3 right-3 text-xs text-white/70 px-2 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>{featured.duration}</div>
                )}
                <div className="absolute top-3 left-3 text-xs font-bold text-white px-2 py-1" style={{ backgroundColor: '#CC0000' }}>최신</div>
              </div>
              <div className="p-4" style={{ backgroundColor: '#080808' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#CC0000' }}>{featured.date}</div>
                <h3 className="text-white font-bold text-lg mb-1">{featured.title}</h3>
                {featured.description && <div className="text-white/40 text-xs">{featured.description}</div>}
              </div>
            </div>

            {/* Playlist */}
            <div className="border border-white/10 overflow-hidden" style={{ backgroundColor: '#080808' }}>
              <div className="px-4 py-3 border-b border-white/10 text-sm font-bold text-white/70">재생목록</div>
              <div className="overflow-y-auto max-h-[340px]">
                {filtered.slice(0, 8).map(v => (
                  <button
                    key={v.id}
                    onClick={() => handlePlay(v)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-left"
                    style={{ backgroundColor: playingId === v.id ? 'rgba(204,0,0,0.1)' : 'transparent' }}
                  >
                    <div className="w-14 h-10 flex-shrink-0 relative overflow-hidden border border-white/10" style={{ backgroundColor: '#0e0e0e' }}>
                      {v.type === 'youtube' ? (
                        <YoutubeThumb yid={v.youtubeId!} title={v.title} />
                      ) : (
                        <VideoThumb id={v.id} filename={v.filename} />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs opacity-70">▶</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/80 text-xs font-semibold truncate">{v.title}</div>
                      <div className="text-white/30 text-[10px] mt-0.5">{v.date}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-10 flex flex-col items-center justify-center py-20 text-white/20 border border-white/10" style={{ backgroundColor: '#080808' }}>
            <div className="text-6xl mb-4">🎬</div>
            <div className="text-lg font-bold mb-1">등록된 영상이 없습니다</div>
            <div className="text-sm">영상 업로드 버튼을 눌러 추가해 주세요</div>
          </div>
        )}

        {/* Upload button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowUpload(true)}
            className="sm:ml-auto px-6 py-2 text-sm font-bold text-white hover:opacity-80 transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#CC0000' }}
          >
            🎬 영상 업로드
          </button>
        </div>

        {/* Video grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/20 text-sm">등록된 영상이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map(v => {
              const isFeatured = featuredVideoId === v.id;
              return (
              <div key={v.id} className="relative group">
                <div
                  className="w-full text-left border transition-all"
                  style={{ backgroundColor: '#080808', borderColor: isFeatured ? '#CC0000' : 'rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="aspect-video flex items-center justify-center relative overflow-hidden border-b border-white/5 cursor-pointer"
                    style={{ backgroundColor: '#0e0e0e' }}
                    onClick={() => handlePlay(v)}
                  >
                    {v.type === 'youtube' ? (
                      <YoutubeThumb yid={v.youtubeId!} title={v.title} />
                    ) : (
                      <VideoThumb id={v.id} filename={v.filename} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'rgba(204,0,0,0.9)' }}>▶</div>
                    </div>
                    {v.type === 'youtube' && (
                      <div className="absolute top-1 right-1 bg-red-700 text-white text-[10px] px-1.5 py-0.5 font-bold">YT</div>
                    )}
                    {isFeatured && (
                      <div className="absolute bottom-1 left-1 text-white text-[9px] font-black px-1.5 py-0.5 z-10" style={{ backgroundColor: '#CC0000' }}>★ 메인</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-white/80 text-xs font-semibold mb-1.5 line-clamp-2 leading-snug">{v.title}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30">{v.date}</span>
                      <button
                        onClick={() => requireAdmin(() => handleSetFeaturedVideo(v))}
                        className="text-[10px] font-black px-2 py-0.5 transition-colors"
                        style={{
                          backgroundColor: isFeatured ? 'rgba(204,0,0,0.2)' : 'rgba(255,255,255,0.07)',
                          color: isFeatured ? '#CC0000' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {isFeatured ? '★ 메인' : '메인설정'}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white/50 hover:text-white hover:bg-red-800 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 업로드 모달 ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-lg p-6 border border-white/10 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#080808' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">영상 등록</h2>
              <button onClick={() => { setShowUpload(false); setVideoFile(null); }} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            {/* 타입 선택 */}
            <div className="flex border border-white/10 mb-5">
              {(['upload', 'youtube'] as VideoType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setUploadType(t)}
                  className="flex-1 py-2 text-sm font-bold transition-colors"
                  style={{ backgroundColor: uploadType === t ? '#CC0000' : '#0e0e0e', color: uploadType === t ? '#fff' : 'rgba(255,255,255,0.5)' }}
                >
                  {t === 'upload' ? '📁 파일 직접 업로드' : '▶ YouTube URL'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="예: 4월 정기 경기 하이라이트"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>

              {uploadType === 'youtube' ? (
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1">YouTube URL *</label>
                  <input
                    type="text"
                    value={form.youtubeUrl}
                    onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                    style={{ backgroundColor: '#0e0e0e' }}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1">영상 파일 *</label>
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-white/20 hover:border-red-800/50 transition-colors flex flex-col items-center gap-2 text-white/40 hover:text-white/60"
                    style={{ backgroundColor: '#080808' }}
                  >
                    {videoFile ? (
                      <>
                        <span className="text-2xl">🎬</span>
                        <span className="text-sm font-bold text-white/70">{videoFile.name}</span>
                        <span className="text-xs text-white/30">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">📁</span>
                        <span className="text-sm font-bold">클릭해서 영상 선택</span>
                        <span className="text-xs text-white/25">MP4, MOV, AVI 등</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">날짜</label>
                <input
                  type="text"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  placeholder="2026.04.08"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">설명 (선택)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="영상에 대한 간단한 설명"
                  rows={2}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none resize-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowUpload(false); setVideoFile(null); }} className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button
                onClick={handleSubmit}
                disabled={uploading || !form.title.trim()}
                className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-40 transition-colors"
                style={{ backgroundColor: '#CC0000' }}
              >
                {uploading ? '저장 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adminModal}

      {/* ── 플레이어 모달 ── */}
      {playingMeta && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.97)' }}>
          <button className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl z-10 p-2" onClick={handleClosePlayer}>✕</button>
          <div className="w-full max-w-4xl px-4">
            {playingMeta.type === 'youtube' ? (
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${playingMeta.youtubeId}?autoplay=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : playingSrc ? (
              <video src={playingSrc} controls autoPlay className="w-full max-h-[80vh] bg-black" />
            ) : (
              <div className="aspect-video flex items-center justify-center text-white/30">불러오는 중...</div>
            )}
            <div className="mt-4 px-2">
              <div className="text-xs font-bold mb-1" style={{ color: '#CC0000' }}>{playingMeta.date}</div>
              <div className="text-white font-bold text-lg">{playingMeta.title}</div>
              {playingMeta.description && <div className="text-white/40 text-sm mt-1">{playingMeta.description}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
