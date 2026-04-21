'use client';

import { useState, useRef, useEffect } from 'react';
import { searchRealPlayers, RealPlayer } from '@/lib/footballApi';
import RealPlayerCard from './RealPlayerCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RealPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const players = await searchRealPlayers(searchQuery);
      setResults(players);
      setSearched(true);
    } catch (err) {
      setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 디바운싱: 사용자가 입력을 멈춘 후 500ms 후에 검색
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        handleSearch(value);
      }, 500);
    } else {
      setResults([]);
      setSearched(false);
    }
  };

  const handleSearchClick = () => {
    handleSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(query);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10" style={{ backgroundColor: '#080808' }}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 z-10" style={{ backgroundColor: '#0a0a0a' }}>
          <h2 className="font-black text-white text-lg flex items-center gap-3">
            <span style={{ fontSize: 20 }}>🔍</span>
            축구 선수 검색
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* 검색 입력 */}
        <div className="p-6 border-b border-white/10" style={{ backgroundColor: '#050505' }}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="선수 이름 입력 (예: 손흥민, 메시, 음바페)"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-3 text-sm text-white outline-none"
              style={{
                backgroundColor: '#0e0e0e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
              }}
            />
            <button
              onClick={handleSearchClick}
              disabled={loading || !query.trim()}
              className="px-6 py-3 font-bold text-white text-sm transition-opacity"
              style={{
                backgroundColor: query.trim() ? '#CC0000' : '#444',
                opacity: loading ? 0.5 : 1,
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                borderRadius: 4,
              }}>
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="p-6" style={{ backgroundColor: '#080808' }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                ⟳
              </div>
              <span className="ml-3 text-white/50 text-sm">검색 중...</span>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 text-sm text-red-400 border border-red-800/30 rounded" style={{ backgroundColor: 'rgba(220,38,38,0.08)' }}>
              ⚠ {error}
            </div>
          )}

          {searched && !loading && results.length === 0 && !error && (
            <div className="py-12 text-center text-white/30">
              <div className="text-4xl mb-3">⚽</div>
              <div className="text-sm font-bold">검색 결과가 없습니다</div>
              <div className="text-xs text-white/20 mt-2">다른 선수명으로 검색해보세요</div>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <div className="mb-4">
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>
                  검색 결과 ({results.length}명)
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {results.map(player => (
                  <RealPlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          )}

          {!searched && !loading && (
            <div className="py-12 text-center text-white/30">
              <div className="text-4xl mb-3">⚽</div>
              <div className="text-sm font-bold">선수 이름을 검색해보세요</div>
              <div className="text-xs text-white/20 mt-3">예: 손흥민, 메시, 음바페, 하알란드...</div>
              <div className="mt-6 space-y-2">
                <div className="text-white/20 text-xs">
                  💡 팁: 실제 리그 선수들을 검색할 수 있습니다!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
