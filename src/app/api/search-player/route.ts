import { NextRequest, NextResponse } from 'next/server';

// ── 유명 선수 로컬 데이터베이스 (API 실패 시 fallback) ──
const LOCAL_PLAYERS: Record<string, any> = {
  kane: { name: 'Harry Kane', club: 'Bayern Munich', position: 'Attacker', nationality: 'England', id: '184',
    stats: { pace:70, shoot:91, pass:78, dribble:79, defense:47, physical:83 } },
  haaland: { name: 'Erling Haaland', club: 'Manchester City', position: 'Attacker', nationality: 'Norway', id: '1100',
    stats: { pace:89, shoot:94, pass:65, dribble:80, defense:45, physical:88 } },
  mbappe: { name: 'Kylian Mbappé', club: 'Real Madrid', position: 'Attacker', nationality: 'France', id: '278',
    stats: { pace:97, shoot:90, pass:80, dribble:92, defense:39, physical:76 } },
  mbappe: { name: 'Kylian Mbappé', club: 'Real Madrid', position: 'Attacker', nationality: 'France', id: '278',
    stats: { pace:97, shoot:90, pass:80, dribble:92, defense:39, physical:76 } },
  messi: { name: 'Lionel Messi', club: 'Inter Miami', position: 'Attacker', nationality: 'Argentina', id: '154',
    stats: { pace:82, shoot:91, pass:91, dribble:95, defense:34, physical:64 } },
  ronaldo: { name: 'Cristiano Ronaldo', club: 'Al Nassr', position: 'Attacker', nationality: 'Portugal', id: '874',
    stats: { pace:87, shoot:93, pass:80, dribble:86, defense:34, physical:88 } },
  salah: { name: 'Mohamed Salah', club: 'Liverpool', position: 'Attacker', nationality: 'Egypt', id: '306',
    stats: { pace:93, shoot:88, pass:78, dribble:87, defense:45, physical:75 } },
  neymar: { name: 'Neymar Jr', club: 'Al-Hilal', position: 'Attacker', nationality: 'Brazil', id: '276',
    stats: { pace:91, shoot:83, pass:86, dribble:94, defense:37, physical:61 } },
  son: { name: 'Son Heung-min', club: 'Tottenham', position: 'Attacker', nationality: 'South Korea', id: '2931',
    stats: { pace:91, shoot:87, pass:83, dribble:87, defense:44, physical:74 } },
  'heung-min': { name: 'Son Heung-min', club: 'Tottenham', position: 'Attacker', nationality: 'South Korea', id: '2931',
    stats: { pace:91, shoot:87, pass:83, dribble:87, defense:44, physical:74 } },
  '손흥민': { name: 'Son Heung-min', club: 'Tottenham', position: 'Attacker', nationality: 'South Korea', id: '2931',
    stats: { pace:91, shoot:87, pass:83, dribble:87, defense:44, physical:74 } },
  debruyne: { name: 'Kevin De Bruyne', club: 'Manchester City', position: 'Midfielder', nationality: 'Belgium', id: '627',
    stats: { pace:76, shoot:86, pass:94, dribble:88, defense:64, physical:78 } },
  lewandowski: { name: 'Robert Lewandowski', club: 'Barcelona', position: 'Attacker', nationality: 'Poland', id: '521',
    stats: { pace:78, shoot:92, pass:79, dribble:83, defense:43, physical:82 } },
  vinicius: { name: 'Vinicius Jr', club: 'Real Madrid', position: 'Attacker', nationality: 'Brazil', id: '1666',
    stats: { pace:95, shoot:84, pass:78, dribble:93, defense:30, physical:68 } },
  bellingham: { name: 'Jude Bellingham', club: 'Real Madrid', position: 'Midfielder', nationality: 'England', id: '46518',
    stats: { pace:82, shoot:84, pass:87, dribble:86, defense:72, physical:83 } },
  pedri: { name: 'Pedri', club: 'Barcelona', position: 'Midfielder', nationality: 'Spain', id: '49960',
    stats: { pace:76, shoot:74, pass:89, dribble:90, defense:67, physical:65 } },
  modric: { name: 'Luka Modric', club: 'Real Madrid', position: 'Midfielder', nationality: 'Croatia', id: '419',
    stats: { pace:74, shoot:76, pass:90, dribble:90, defense:72, physical:66 } },
  benzema: { name: 'Karim Benzema', club: 'Al-Ittihad', position: 'Attacker', nationality: 'France', id: '166',
    stats: { pace:77, shoot:88, pass:82, dribble:87, defense:38, physical:77 } },
  rashford: { name: 'Marcus Rashford', club: 'Manchester United', position: 'Attacker', nationality: 'England', id: '521',
    stats: { pace:92, shoot:82, pass:74, dribble:85, defense:36, physical:74 } },
  saka: { name: 'Bukayo Saka', club: 'Arsenal', position: 'Attacker', nationality: 'England', id: '31528',
    stats: { pace:87, shoot:82, pass:82, dribble:87, defense:58, physical:68 } },
  odegaard: { name: 'Martin Ødegaard', club: 'Arsenal', position: 'Midfielder', nationality: 'Norway', id: '49918',
    stats: { pace:78, shoot:81, pass:90, dribble:87, defense:62, physical:63 } },
  alisson: { name: 'Alisson', club: 'Liverpool', position: 'Goalkeeper', nationality: 'Brazil', id: '241',
    stats: { pace:60, shoot:31, pass:78, dribble:50, defense:87, physical:74 } },
  courtois: { name: 'Thibaut Courtois', club: 'Real Madrid', position: 'Goalkeeper', nationality: 'Belgium', id: '128',
    stats: { pace:57, shoot:32, pass:76, dribble:46, defense:88, physical:82 } },
  yamal: { name: 'Lamine Yamal', club: 'Barcelona', position: 'Attacker', nationality: 'Spain', id: '347505',
    stats: { pace:91, shoot:81, pass:85, dribble:92, defense:28, physical:60 } },
};

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || '';
  if (!query.trim()) return NextResponse.json([]);

  // 1️⃣ 로컬 DB 우선 검색
  const normalized = query.toLowerCase().replace(/\s+/g, '');
  const localKey = Object.keys(LOCAL_PLAYERS).find(k =>
    normalized.includes(k) || k.includes(normalized)
  );
  const localHit = localKey ? LOCAL_PLAYERS[localKey] : null;

  // 2️⃣ TheSportsDB 무료 API (키 불필요)
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query)}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const players = data?.player;

    if (players && players.length > 0) {
      const results = players.slice(0, 5).map((p: any) => {
        // 로컬 DB에 있는 선수면 정확한 능력치 사용
        const localData = findLocal(p.strPlayer);
        return {
          id: p.idPlayer,
          name: p.strPlayer,
          club: p.strTeam || '정보 없음',
          position: p.strPosition || '정보 없음',
          nationality: p.strNationality || '정보 없음',
          image: p.strCutout || p.strThumb || null,
          stats: localData?.stats || estimateStats(p.strPosition || ''),
        };
      });
      return NextResponse.json(results);
    }
  } catch (e) {
    console.error('TheSportsDB error:', e);
  }

  // 3️⃣ 로컬 DB fallback
  if (localHit) {
    return NextResponse.json([{
      id: localHit.id,
      name: localHit.name,
      club: localHit.club,
      position: localHit.position,
      nationality: localHit.nationality,
      image: `https://media.api-sports.io/football/players/${localHit.id}.png`,
      stats: localHit.stats,
    }]);
  }

  return NextResponse.json([]);
}

function findLocal(name: string) {
  const n = name.toLowerCase().replace(/\s+/g, '');
  const key = Object.keys(LOCAL_PLAYERS).find(k =>
    n.includes(k) || k.includes(n)
  );
  return key ? LOCAL_PLAYERS[key] : null;
}

function estimateStats(pos: string) {
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p.includes('gk'))
    return { pace:55, shoot:25, pass:68, dribble:44, defense:84, physical:76 };
  if (p.includes('defender') || p.includes('back'))
    return { pace:72, shoot:48, pass:67, dribble:60, defense:82, physical:80 };
  if (p.includes('midfielder') || p.includes('mid'))
    return { pace:74, shoot:72, pass:83, dribble:78, defense:65, physical:72 };
  return { pace:82, shoot:84, pass:74, dribble:82, defense:42, physical:75 };
}
