'use client';

import { useState, useRef, useEffect } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, orderBy, query
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';

const USER_AUTH_KEY = 'taes-user-login';

// ── 이미지 압축 → dataUrl (미리보기용) ──
function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  return new Promise(resolve => {
    const img = document.createElement('img') as HTMLImageElement;
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

// ── 썸네일 이미지 생성 (그리드용) ──
function generateThumbnailUrl(url: string, size: 'small' | 'medium' = 'small'): string {
  if (!url || !url.includes('firebasestorage')) return url;
  // Firebase Storage에 이미지 최적화 파라미터 추가
  const sizePixels = size === 'small' ? 300 : 600;
  return `${url}&w=${sizePixels}&h=${sizePixels}&q=80`;
}

// ── dataUrl → Blob (fetch 없이 순수 JS 변환) ──
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

// ── Firebase Storage 업로드 → 다운로드 URL 반환 ──
async function uploadToStorage(albumId: string, itemId: string, dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const storageRef = ref(storage, `albums/${albumId}/${itemId}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const [lightbox, setLightbox] = useState<{ albumId: string; itemIdx: number } | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

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

  // ── 터치 스와이프 처리 ──
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent, onPrev: () => void, onNext: () => void) {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // 50px 이상 움직였을 때만 동작
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // 왼쪽으로 스와이프 → 다음 사진
        onNext();
      } else {
        // 오른쪽으로 스와이프 → 이전 사진
        onPrev();
      }
    }
  }

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
    if (!confirm('앨범을 삭제하면 사진도 모두 삭제됩니다. 계속할까요?')) return;
    const album = albums.find(a => a.id === id);
    try {
      // Storage 파일 삭제 (base64 항목은 무시)
      if (album) {
        for (const item of album.items) {
          try {
            await deleteObject(ref(storage, `albums/${id}/${item.id}.jpg`));
          } catch { /* base64 항목이거나 이미 삭제됨 */ }
        }
      }
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
      const total = uploadPreviews.length;

      for (let i = 0; i < total; i++) {
        const preview = uploadPreviews[i];
        setUploadProgress({ current: i + 1, total });
        const itemId = String(Date.now() + i).replace('.', '');
        // Firebase Storage에 업로드 → 다운로드 URL 저장
        const downloadUrl = await uploadToStorage(uploadAlbumId, itemId, preview.dataUrl);
        newItems.push({ id: itemId, url: downloadUrl, name: preview.name, type: 'photo' });
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
      setUploadProgress(null);
      setShowUpload(false);
      setUploadPreviews([]);
      setUploadAlbumId('');
    }
  }

  async function handleDeleteItem(albumId: string, itemId: string) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    try {
      // Storage 파일 삭제 시도 (base64 항목은 무시)
      try {
        await deleteObject(ref(storage, `albums/${albumId}/${itemId}.jpg`));
      } catch { /* base64 항목이거나 이미 삭제됨 */ }

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
      const total = previews.length;

      for (let i = 0; i < total; i++) {
        const preview = previews[i];
        setUploadProgress({ current: i + 1, total });
        const itemId = String(Date.now() + i).replace('.', '');
        const downloadUrl = await uploadToStorage(openAlbum.id, itemId, preview.dataUrl);
        newItems.push({ id: itemId, url: downloadUrl, name: preview.name, type: 'photo' });
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
      setUploadProgress(null);
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
            <div className="text-white text-center px-8 py-6 rounded-xl" style={{ backgroundColor: '#111' }}>
              <div className="text-3xl mb-3" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>☁️</div>
              <div className="font-bold text-lg mb-1">업로드 중...</div>
              {uploadProgress && (
                <>
                  <div className="text-white/50 text-sm mb-3">{uploadProgress.current} / {uploadProgress.total} 장</div>
                  <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#333' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, backgroundColor: '#CC0000' }} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 앨범 내부 뷰 ── */}
        {openAlbum ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
              <button onClick={() => setOpenAlbum(null)} className="text-sm text-white/50 hover:text-white transition-colors text-left">
                ← 앨범 목록
              </button>
              <div className="text-white/20 hidden sm:block">|</div>
              <div className="flex-1 min-w-0">
                <span className="text-white font-bold block sm:inline">{openAlbum.title}</span>
                <span className="text-white/30 text-xs sm:text-sm ml-0 sm:ml-2 block sm:inline">{openAlbum.date} · {openAlbum.items.length}개</span>
              </div>
              <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAlbumFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 sm:py-2 text-sm font-bold text-white hover:opacity-80 transition-colors flex-1 sm:flex-none touch-manipulation"
                  style={{ backgroundColor: '#CC0000' }}
                >
                  + 추가
                </button>
                <button
                  onClick={() => handleDeleteAlbum(openAlbum.id)}
                  className="px-4 py-2.5 sm:py-2 text-sm font-bold text-white/50 hover:text-red-400 border border-white/10 hover:border-red-800/50 transition-colors flex-1 sm:flex-none touch-manipulation"
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
                  const isLoading = imageLoading[item.id];
                  const thumbnailUrl = generateThumbnailUrl(item.url, 'small');
                  return (
                  <div key={item.id} className="relative group aspect-square bg-white/5 rounded overflow-hidden">
                    {isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent animate-pulse" />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover cursor-pointer border transition-all duration-300"
                      style={{ borderColor: isFeatured ? '#CC0000' : 'rgba(255,255,255,0.1)', opacity: isLoading ? 0.5 : 1 }}
                      onClick={() => setLightbox({ albumId: openAlbum.id, itemIdx: idx })}
                      onLoad={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
                      onError={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
                      onLoadingStatusChange={(status) => {
                        if (status === 'loading') setImageLoading(prev => ({ ...prev, [item.id]: true }));
                      }}
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
              <div className="flex border border-white/10 w-full sm:w-auto">
                <button
                  onClick={() => setView('albums')}
                  className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-2 text-sm font-bold transition-colors touch-manipulation"
                  style={{ backgroundColor: view === 'albums' ? '#CC0000' : '#080808', color: view === 'albums' ? '#fff' : 'rgba(255,255,255,0.5)' }}
                >
                  앨범
                </button>
                <button
                  onClick={() => setView('all')}
                  className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-2 text-sm font-bold transition-colors touch-manipulation"
                  style={{ backgroundColor: view === 'all' ? '#CC0000' : '#080808', color: view === 'all' ? '#fff' : 'rgba(255,255,255,0.5)' }}
                >
                  전체
                </button>
              </div>

              <button
                onClick={() => requireAdmin(() => { setShowUpload(true); if (albums.length) setUploadAlbumId(albums[0].id); })}
                className="px-4 py-2.5 sm:py-2 sm:ml-auto text-sm font-bold text-white hover:opacity-80 transition-colors flex items-center justify-center sm:justify-start gap-2 touch-manipulation"
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
                          <>
                            {imageLoading[album.items[0].id] && (
                              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent animate-pulse" />
                            )}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={generateThumbnailUrl(album.items[0].url, 'medium')}
                              alt="thumb"
                              loading="lazy"
                              className="w-full h-full object-cover transition-opacity duration-300"
                              style={{ opacity: imageLoading[album.items[0].id] ? 0.5 : 1 }}
                              onLoad={() => setImageLoading(prev => ({ ...prev, [album.items[0].id]: false }))}
                              onError={() => setImageLoading(prev => ({ ...prev, [album.items[0].id]: false }))}
                            />
                          </>
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
                    {allItems.map((item, idx) => {
                      const isLoading = imageLoading[item.id];
                      const thumbnailUrl = generateThumbnailUrl(item.url, 'small');
                      return (
                      <div
                        key={item.id}
                        className="relative group aspect-square cursor-pointer bg-white/5 rounded overflow-hidden"
                        onClick={() => setLightbox({ albumId: item.albumId, itemIdx: idx })}
                      >
                        {isLoading && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent animate-pulse" />
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbnailUrl}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover border border-white/10 hover:border-red-800/50 transition-all duration-300"
                          style={{ opacity: isLoading ? 0.5 : 1 }}
                          onLoad={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
                          onError={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
                        />
                      </div>
                    );
                    })}
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
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 max-h-40 overflow-y-auto">
                  {uploadPreviews.map((p, i) => (
                    <div key={i} className="relative aspect-square group bg-white/5 rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover border border-white/10" />
                      <button
                        onClick={() => setUploadPreviews(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 w-6 h-6 bg-black/80 text-white/70 hover:text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
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

        const handlePrev = () => {
          if (lightbox.itemIdx > 0) {
            setLightbox(l => l ? { ...l, itemIdx: l.itemIdx - 1 } : null);
          }
        };

        const handleNext = () => {
          if (lightbox.itemIdx < total - 1) {
            setLightbox(l => l ? { ...l, itemIdx: l.itemIdx + 1 } : null);
          }
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.97)' }}
            onClick={() => setLightbox(null)}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, handlePrev, handleNext)}
          >
            <button className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/50 hover:text-white text-2xl z-10 p-2 touch-manipulation" onClick={() => setLightbox(null)}>✕</button>

            {lightbox.itemIdx > 0 && (
              <button
                className="absolute left-2 sm:left-6 text-white/50 hover:text-white text-4xl sm:text-5xl z-10 p-3 sm:p-4 touch-manipulation active:scale-110 transition-transform"
                onClick={e => { e.stopPropagation(); handlePrev(); }}
              >
                ‹
              </button>
            )}

            <div className="max-w-5xl w-full px-4 sm:px-16" onClick={e => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                className="max-h-[85vh] mx-auto object-contain"
                style={{ maxHeight: '85vh', maxWidth: '100%' }}
                onLoad={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
                onError={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
              />
            </div>

            {lightbox.itemIdx < total - 1 && (
              <button
                className="absolute right-2 sm:right-6 text-white/50 hover:text-white text-4xl sm:text-5xl z-10 p-3 sm:p-4 touch-manipulation active:scale-110 transition-transform"
                onClick={e => { e.stopPropagation(); handleNext(); }}
              >
                ›
              </button>
            )}

            <div className="absolute bottom-4 text-white/30 text-xs sm:text-sm touch-manipulation select-none">{lightbox.itemIdx + 1} / {total}</div>
          </div>
        );
      })()}
      {adminModal}
    </div>
  );
}
