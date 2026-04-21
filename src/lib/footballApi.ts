// 실제 축구 선수 검색 API
// 참고: https://www.api-football.com/ (rapidapi)

export interface RealPlayer {
  id: string;
  name: string;
  club: string;
  position: string;
  nationality: string;
  image?: string;
  number?: number;
  stats?: {
    pace: number;
    shoot: number;
    pass: number;
    dribble: number;
    defense: number;
    physical: number;
  };
}

// 실제 API 호출 (RapidAPI Football 사용)
// 환경변수: NEXT_PUBLIC_FOOTBALL_API_KEY 필요
export async function searchRealPlayers(query: string): Promise<RealPlayer[]> {
  try {
    if (!query.trim()) return [];

    // API 엔드포인트: RapidAPI Football
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.NEXT_PUBLIC_FOOTBALL_API_KEY || '',
        'X-RapidAPI-Host': 'api-football.p.rapidapi.com',
      },
    };

    const response = await fetch(
      `https://api-football.p.rapidapi.com/players?search=${encodeURIComponent(query)}&limit=5`,
      options
    );

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response || !Array.isArray(data.response)) {
      return [];
    }

    // 응답 데이터 변환
    return data.response.map((player: any) => ({
      id: `${player.player.id}`,
      name: player.player.name || '',
      club: player.statistics[0]?.team?.name || '정보 없음',
      position: player.statistics[0]?.games?.position || player.player.type || '정보 없음',
      nationality: player.player.nationality || '정보 없음',
      number: player.statistics[0]?.games?.number,
      image: player.player.photo,
      stats: {
        pace: Math.floor(Math.random() * 30 + 60), // 임시: 실제 API에서는 능력치 데이터 필요
        shoot: Math.floor(Math.random() * 30 + 60),
        pass: Math.floor(Math.random() * 30 + 60),
        dribble: Math.floor(Math.random() * 30 + 60),
        defense: Math.floor(Math.random() * 30 + 60),
        physical: Math.floor(Math.random() * 30 + 60),
      },
    })) as RealPlayer[];
  } catch (error) {
    console.error('선수 검색 실패:', error);

    // 오류 시 샘플 데이터 반환 (테스트용)
    if (query.toLowerCase().includes('손흥민')) {
      return [{
        id: 'sample-1',
        name: '손흥민',
        club: '토트넘 홋스퍼',
        position: 'LW',
        nationality: '대한민국',
        image: undefined,
        number: 7,
        stats: { pace: 89, shoot: 82, pass: 80, dribble: 87, defense: 41, physical: 78 },
      }];
    }
    if (query.toLowerCase().includes('박지성')) {
      return [{
        id: 'sample-2',
        name: '박지성',
        club: '맨체스터 유나이티드',
        position: 'MF',
        nationality: '대한민국',
        image: undefined,
        number: 13,
        stats: { pace: 83, shoot: 79, pass: 85, dribble: 84, defense: 76, physical: 80 },
      }];
    }

    return [];
  }
}

// 인기 선수 조회 (옵션)
export async function getPopularPlayers(): Promise<RealPlayer[]> {
  const popularNames = ['Messi', 'Ronaldo', 'Mbappé', 'Haaland', 'Benzema'];
  const results: RealPlayer[] = [];

  for (const name of popularNames) {
    const players = await searchRealPlayers(name);
    if (players.length > 0) {
      results.push(players[0]);
    }
  }

  return results;
}
