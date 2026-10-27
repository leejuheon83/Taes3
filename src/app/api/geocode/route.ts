import { NextResponse } from 'next/server';

// 카카오 로컬 API 프록시.
// REST 키를 브라우저에 노출하지 않으려고 서버에서만 호출한다.
const KAKAO_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/keyword.json';

type KakaoDocument = {
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  x: string; // 경도
  y: string; // 위도
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ error: '검색어를 입력해 주세요.' }, { status: 400 });
  }

  const restKey = process.env.KAKAO_REST_KEY;
  if (!restKey) {
    return NextResponse.json(
      { error: '카카오 API 키가 아직 설정되지 않았습니다. 좌표를 직접 입력해 주세요.' },
      { status: 503 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${KAKAO_ENDPOINT}?query=${encodeURIComponent(query)}&size=10`, {
      headers: { Authorization: `KakaoAK ${restKey}` },
    });
  } catch (err) {
    console.error('Kakao request failed:', err);
    return NextResponse.json({ error: '장소 검색 서버에 연결하지 못했습니다.' }, { status: 502 });
  }

  if (!res.ok) {
    const message =
      res.status === 401
        ? '카카오 API 키가 올바르지 않습니다.'
        : res.status === 403
          ? '앱에서 카카오맵 API가 켜져 있는지 확인해 주세요.'
          : res.status === 429
            ? '오늘 카카오 API 사용량을 모두 소진했습니다.'
            : '장소를 검색하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const data = (await res.json()) as { documents?: KakaoDocument[] };
  const places = (data.documents ?? []).map(d => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name || '',
    lat: Number(d.y), // 카카오는 y가 위도, x가 경도
    lng: Number(d.x),
  }));

  return NextResponse.json({ places });
}
