import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  const apiKey = process.env.FOOTBALL_API_KEY || process.env.NEXT_PUBLIC_FOOTBALL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  try {
    // 현재 시즌 검색
    const res = await fetch(
      `https://api-football.p.rapidapi.com/players?search=${encodeURIComponent(query)}&season=2024`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'api-football.p.rapidapi.com',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    if (!data.response || data.response.length === 0) {
      // 시즌 없이 재시도
      const res2 = await fetch(
        `https://api-football.p.rapidapi.com/players?search=${encodeURIComponent(query)}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football.p.rapidapi.com',
          },
        }
      );
      const data2 = await res2.json();
      return NextResponse.json(mapPlayers(data2.response || []));
    }

    return NextResponse.json(mapPlayers(data.response));
  } catch (err) {
    console.error('Football API error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function mapPlayers(response: any[]) {
  return response.slice(0, 6).map((item: any) => {
    const p = item.player;
    const stat = item.statistics?.[0];
    const pos = stat?.games?.position || 'Unknown';

    // 포지션별 능력치 추정 (API 무료 플랜은 실제 능력치 미제공)
    const posStats = estimateStats(pos, stat);

    return {
      id: String(p.id),
      name: p.name,
      club: stat?.team?.name || '정보 없음',
      position: pos,
      nationality: p.nationality || '정보 없음',
      number: stat?.games?.number,
      image: p.photo,   // api-football이 제공하는 선수 사진 URL
      stats: posStats,
    };
  });
}

// 실제 능력치가 없는 경우 포지션 + 통계 기반 추정
function estimateStats(pos: string, stat: any) {
  const goals = stat?.goals?.total || 0;
  const assists = stat?.goals?.assists || 0;
  const rating = parseFloat(stat?.games?.rating || '0') || 0;
  const base = rating > 0 ? Math.min(99, Math.round(rating * 10)) : 70;

  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p.includes('gk')) {
    return { pace: 45, shoot: 20, pass: 60, dribble: 40, defense: 82 + Math.min(10, goals), physical: 78 };
  }
  if (p.includes('defender')) {
    return { pace: 68, shoot: 45, pass: 65, dribble: 58, defense: Math.min(99, 80 + Math.min(10, assists)), physical: 80 };
  }
  if (p.includes('midfielder')) {
    return { pace: 72, shoot: 65, pass: Math.min(99, 75 + Math.min(10, assists * 2)), dribble: 74, defense: 62, physical: 72 };
  }
  // Attacker / Forward
  return {
    pace: Math.min(99, 78 + Math.min(10, goals)),
    shoot: Math.min(99, 78 + Math.min(12, goals * 2)),
    pass: Math.min(99, 68 + Math.min(10, assists * 3)),
    dribble: Math.min(99, 78 + Math.min(10, goals)),
    defense: 40,
    physical: 74,
  };
}
