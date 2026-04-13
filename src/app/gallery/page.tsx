'use client';

import { useState, useRef, useEffect } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, orderBy, query
} from 'firebase/firestore';

const USER_AUTH_KEY = 'taes-user-login';

// ── 이미지 압축 ──
function compressImage(file: File, maxDim = 1200, quality = 0.75): Promise<string> {
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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}

type MediaItem = { id: string; url: string; name: string; type: 'photo' };
type Album = { id: string; title: string; date: string; grade?: string; items: MediaItem[] };

export default function GalleryPage() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<'albums' | 'all'>('albums');
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [featuredPhotoId, setFeaturedPhotoId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10).replace(/-/g, '.'));

  const [showUpload, setShowUpload] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState<string>('');
  const [uploadPreviews, setUploadPreviews] = useState<{ dataUrl: string; name: string }[]>([]);

  const [lightbox, setLightbox] = useState<{ albumId: string; itemIdx: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem(USER_AUTH_KEY) !== '1') {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const q = query(collection(db, 'albums'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const loaded: Album[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Album, 'id'>),
      }));
      setAlbums(loaded);

      // Load featured photo id from settings
      const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.featuredPhoto?.id) setFeaturedPhotoId(data.featuredPhoto.id);
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) return null;

  async function handleCreateAlbum() {
    if (!newTitle.trim()) return;
    const albumId = String(Date.now());
    const album: Album = { id: albumId, title: newTitle.trim(), date: newDate, items: [] };
    try {
      await setDoc(doc(db, 'albums', albumId), {
        title: album.title,
        date: album.date,
        items: [],
      });
      setAlbums(prev => [album, ...prev]);
    } catch (err) {
      console.error('Failed to create album:', err);
      alert('앨범 생성에 실패했습니다.');
    }
    setShowNewAlbum(false);
    setNewTitle('');
  }

  async function handleDeleteAlbum(id: string) {
    if (!confirm('앨범을 삭제하면 사진·영상도 모두 삭제됩니다. 계속할까요?')) return;
    try {
      await deleteDoc(doc(db, 'albums', id));
      setAlbums(prev => prev.filter(a => a.id !== id));
      if (openAlbum?.id === id) setOpenAlbum(null);
    } catch (err) {
      console.error('Failed to delete album:', err);
      alert('앨범 삭제에 실패했습니다.');
    }
  }

  async function readFiles(files: File[]): Promise<{ dataUrl: string; name: string }[]> {
    return Promise.all(files.map(async file => {
      const dataUrl = await compressImage(file, 1200, 0.75);
      return { dataUrl, name: file.name };
    }));
  }

  function handleFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    readFiles(files).then(items => setUploadPreviews(prev => [...prev, ...items]));
    e.target.value = '';
  }

  async function handleUploadConfirm() {
    if (!uploadAlbumId || !uploadPreviews.length) return;
    setUploading(true);
    try {
      const album = albums.find(a => a.id === uploadAlbumId);
      if (!album) return;

      const newItems: MediaItem[] = [];
      for (const preview of uploadPreviews) {
        const itemId = String(Date.now() + Math.random());
        // Store base64 dataURL directly in Firestore
        newItems.push({ id: itemId, url: preview.dataUrl, name: preview.name, type: 'photo' });
      }

      const updatedItems = [...album.items, ...newItems];
      await updateDoc(doc(db, 'albums', uploadAlbumId), { items: updatedItems });

      setAlbums(prev => prev.map(a => a.id === uploadAlbumId ? { ...a, items: updatedItems } : a));
      if (openAlbum?.id === uploadAlbumId) {
        setOpenAlbum(prev => prev ? { ...prev, items: updatedItems } : null);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setShowUpload(false);
      setUploadPreviews([]);
      setUploadAlbumId('');
    }
  }

  async function handleDeleteItem(albumId: string, itemId: string) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    try {
      const updatedItems = album.items.filter(p => p.id !== itemId);
      await updateDoc(doc(db, 'albums', albumId), { items: updatedItems });
      setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, items: updatedItems } : a));
      if (openAlbum?.id === albumId) {
        setOpenAlbum(prev => prev ? { ...prev, items: updatedItems } : null);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('삭제에 실패했습니다.');
    }
  }

  async function handleSetFeatured(item: MediaItem) {
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        featuredPhoto: { id: item.id, url: item.url }
      }, { merge: true });
      setFeaturedPhotoId(item.id);
    } catch (err) {
      console.error('Failed to set featured:', err);
      alert('설정 저장에 실패했습니다.');
    }
  }

  async function handleAlbumFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!openAlbum) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';

    setUploading(true);
    try {
      const previews = await readFiles(files);
      const newItems: MediaItem[] = [];
      for (const preview of previews) {
        const itemId = String(Date.now() + Math.random());
        // Store base64 dataURL directly in Firestore
        newItems.push({ id: itemId, url: preview.dataUrl, name: preview.name, type: 'photo' });
      }

      const updatedItems = [...openAlbum.items, ...newItems];
      await updateDoc(doc(db, 'albums', openAlbum.id), { items: updatedItems });
      setAlbums(prev => prev.map(a => a.id === openAlbum.id ? { ...a, items: updatedItems } : a));
      setOpenAlbum(prev => prev ? { ...prev, items: updatedItems } : null);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  const filteredAlbums = albums;
  const allItems = albums.flatMap(a => a.items.map(p => ({ ...p, albumId: a.id })));

  return (
    <div className="min-h-screen">
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #050505 0%, #1a0000 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>GALLERY</div>
          <h1 className="text-4xl font-black text-white mb-2">사진 갤러리</h1>
          <p className="text-white/40 text-sm">TAES FC 프리미어의 생생한 경기 & 훈련 현장을 담았습니다.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {uploading && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="text-white text-center">
              <div className="text-2xl mb-3 animate-spin">⏳</div>
              <div className="font-bold">업로드 중...</div>
            </div>
          </div>
        )}

        {/* ── 앨범 내부 뷰 ── */}
        {openAlbum ? (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button onClick={() => setOpenAlbum(null)} className="text-sm text-white/50 hover:text-white transition-colors">
                ← 앨범 목록
              </button>
              <div className="text-white/20">|</div>
              <div>
                <span className="text-white font-bold">{openAlbum.title}</span>
                <span className="text-white/30 text-sm ml-2">{openAlbum.date} · {openAlbum.items.length}개</span>
              </div>
              <div className="ml-auto flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAlbumFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 text-sm font-bold text-white hover:opacity-80 transition-colors"
                  style={{ backgroundColor: '#CC0000' }}
                >
                  + 추가
                </button>
                <button
                  onClick={() => handleDeleteAlbum(openAlbum.id)}
                  className="px-4 py-2 text-sm font-bold text-white/50 hover:text-red-400 border border-white/10 hover:border-red-800/50 transition-colors"
                >
                  앨범 삭제
                </button>
              </div>
            </div>

            {openAlbum.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/20">
                <div className="text-6xl mb-4">📷</div>
                <div className="text-lg font-bold mb-1">사진이 없습니다</div>
                <div className="text-sm">+ 추가 버튼으로 업로드하세요</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {openAlbum.items.map((item, idx) => {
                  const isFeatured = featuredPhotoId === item.id;
                  return (
                  <div key={item.id} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover cursor-pointer border transition-colors"
                      style={{ borderColor: isFeatured ? '#CC0000' : 'rgba(255,255,255,0.1)' }}
                      onClick={() => setLightbox({ albumId: openAlbum.id, itemIdx: idx })}
                    />
                    {isFeatured && (
                      <div className="absolute bottom-1 left-1 text-white text-[9px] font-black px-1.5 py-0.5 z-10" style={{ backgroundColor: '#CC0000' }}>
                        ★ 메인
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); requireAdmin(() => handleSetFeatured(item)); }}
                        className="px-2 py-1 text-[10px] font-black text-white transition-colors"
                        style={{ backgroundColor: isFeatured ? '#666' : '#CC0000' }}
                      >
                        {isFeatured ? '✓ 메인 설정됨' : '★ 메인으로 설정'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(openAlbum.id, item.id); }}
                        className="px-2 py-1 text-[10px] font-bold text-white/70 hover:text-white bg-black/60 hover:bg-red-900 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex border border-white/10">
                <button
                  onClick={() => setView('albums')}
                  className="px-5 py-2 text-sm font-bold transition-colors"
                  style={{ backgroundColor: view === 'albums' ? '#CC0000' : '#080808', color: view === 'albums' ? '#fff' : 'rgba(255,255,255,0.5)' }}
                >
                  앨범
                </button>
                <button
                  onClick={() => setView('all')}
                  className="px-5 py-2 text-sm font-bold transition-colors"
                  style={{ backgroundColor: view === 'all' ? '#CC0000' : '#080808', color: view === 'all' ? '#fff' : 'rgba(255,255,255,0.5)' }}
                >
                  전체
                </button>
              </div>

              <button
                onClick={() => requireAdmin(() => { setShowUpload(true); if (albums.length) setUploadAlbumId(albums[0].id); })}
                className="sm:ml-auto px-6 py-2 text-sm font-bold text-white hover:opacity-80 transition-colors flex items-center gap-2"
                style={{ backgroundColor: '#CC0000' }}
              >
                📷 사진 업로드
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24 text-white/30">
                <div className="text-center">
                  <div className="text-4xl mb-3 animate-pulse">📷</div>
                  <div>로딩 중...</div>
                </div>
              </div>
            ) : view === 'albums' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAlbums.map(album => (
                  <div key={album.id} className="relative group">
                    <button
                      onClick={() => setOpenAlbum(album)}
                      className="w-full text-left border border-white/10 hover:border-red-800/50 transition-all card-hover"
                      style={{ backgroundColor: '#080808' }}
                    >
                      <div className="aspect-video flex items-center justify-center border-b border-white/5 overflow-hidden relative" style={{ backgroundColor: '#0e0e0e' }}>
                        {album.items[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.items[0].url} alt="thumb" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-5xl text-white/10">📷</span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="text-white font-semibold text-sm mb-2 group-hover:text-red-400 transition-colors leading-snug">{album.title}</div>
                        <div className="flex justify-between text-xs text-white/30">
                          <span>{album.date}</span>
                          <span>
                            {album.items.length > 0 ? `📷 ${album.items.length}장` : '비어있음'}
                          </span>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white/50 hover:text-white hover:bg-red-800 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => requireAdmin(() => setShowNewAlbum(true))}
                  className="min-h-[180px] border-2 border-dashed border-white/10 hover:border-red-800/50 transition-colors flex flex-col items-center justify-center gap-3 text-white/20 hover:text-white/40"
                  style={{ backgroundColor: '#080808' }}
                >
                  <span className="text-4xl">+</span>
                  <span className="text-sm font-bold">새 앨범 만들기</span>
                </button>
              </div>
            ) : (
              <div>
                {allItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-white/20">
                    <div className="text-6xl mb-4">🖼️</div>
                    <div className="text-lg font-bold">등록된 사진이 없습니다</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {allItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative group aspect-square cursor-pointer"
                        onClick={() => setLightbox({ albumId: item.albumId, itemIdx: idx })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover border border-white/10 hover:border-red-800/50 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 새 앨범 모달 ── */}
      {showNewAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md p-6 border border-white/10" style={{ backgroundColor: '#080808' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">새 앨범 만들기</h2>
              <button onClick={() => setShowNewAlbum(false)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">앨범 제목 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateAlbum()}
                  placeholder="예: 3월 정기 훈련"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">날짜</label>
                <input
                  type="text"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  placeholder="2025.03.22"
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewAlbum(false)} className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button onClick={handleCreateAlbum} disabled={!newTitle.trim()} className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-30 transition-colors" style={{ backgroundColor: '#CC0000' }}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 업로드 모달 ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg p-6 border border-white/10" style={{ backgroundColor: '#080808' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">사진 업로드</h2>
              <button onClick={() => { setShowUpload(false); setUploadPreviews([]); }} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-white/50 mb-1">앨범 선택</label>
              {albums.length === 0 ? (
                <div className="text-sm text-white/30 py-2">
                  앨범이 없습니다.{' '}
                  <button onClick={() => { setShowUpload(false); setShowNewAlbum(true); }} className="underline" style={{ color: '#CC0000' }}>새 앨범 만들기</button>
                </div>
              ) : (
                <select
                  value={uploadAlbumId}
                  onChange={e => setUploadAlbumId(e.target.value)}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 outline-none"
                  style={{ backgroundColor: '#0e0e0e' }}
                >
                  <option value="">앨범을 선택하세요</option>
                  {albums.map(a => <option key={a.id} value={a.id}>{a.title} ({a.date})</option>)}
                </select>
              )}
            </div>

            <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelect} />
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-white/20 hover:border-red-800/50 transition-colors flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/60 mb-4"
              style={{ backgroundColor: '#080808' }}
            >
              <span className="text-3xl">📁</span>
              <span className="text-sm font-bold">클릭해서 파일 선택</span>
              <span className="text-xs text-white/25">JPG, PNG, HEIC 지원 · 여러 장 선택 가능</span>
            </button>

            {uploadPreviews.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-white/40 mb-2">{uploadPreviews.length}장 선택됨</div>
                <div className="grid grid-cols-5 gap-1 max-h-40 overflow-y-auto">
                  {uploadPreviews.map((p, i) => (
                    <div key={i} className="relative aspect-square group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover border border-white/10" />
                      <button
                        onClick={() => setUploadPreviews(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 w-5 h-5 bg-black/80 text-white/70 hover:text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowUpload(false); setUploadPreviews([]); }} className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button
                onClick={handleUploadConfirm}
                disabled={!uploadAlbumId || uploadPreviews.length === 0 || uploading}
                className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-30 transition-colors"
                style={{ backgroundColor: '#CC0000' }}
              >
                {uploading ? '업로드 중...' : `업로드 (${uploadPreviews.length}개)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 라이트박스 ── */}
      {lightbox && (() => {
        const album = albums.find(a => a.id === lightbox.albumId);
        // For 'all' view, we need to find by index in allItems
        const isAllView = view === 'all' && !openAlbum;
        const items = isAllView ? allItems : album?.items ?? [];
        const item = items[lightbox.itemIdx];
        if (!item) return null;
        const total = items.length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.97)' }} onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl z-10 p-2" onClick={() => setLightbox(null)}>✕</button>
            {lightbox.itemIdx > 0 && (
              <button className="absolute left-2 sm:left-6 text-white/50 hover:text-white text-5xl z-10 p-4" onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, itemIdx: l.itemIdx - 1 } : null); }}>‹</button>
            )}
            <div className="max-w-5xl w-full px-16" onClick={e => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.name} className="max-h-[85vh] mx-auto object-contain" style={{ maxHeight: '85vh', maxWidth: '100%' }} />
            </div>
            {lightbox.itemIdx < total - 1 && (
              <button className="absolute right-2 sm:right-6 text-white/50 hover:text-white text-5xl z-10 p-4" onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, itemIdx: l.itemIdx + 1 } : null); }}>›</button>
            )}
            <div className="absolute bottom-4 text-white/30 text-sm">{lightbox.itemIdx + 1} / {total}</div>
          </div>
        );
      })()}
      {adminModal}
    </div>
  );
}
