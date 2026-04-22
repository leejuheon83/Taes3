// 실제 축구 선수 검색 (서버 API Route 경유 → CORS 없음)

export interface RealPlayer {
  id: string;
  name: string;
  club: string;
  position: string;
  nationality: string;
  image?: string;
  number?: number;
  stats: {
    pace: number;
    shoot: number;
    pass: number;
    dribble: number;
    defense: number;
    physical: number;
  };
}

export async function searchRealPlayers(query: string): Promise<RealPlayer[]> {
  if (!query.trim()) return [];

  const res = await fetch(`/api/search-player?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();

  if (data.error) throw new Error(data.error);
  return data as RealPlayer[];
}
