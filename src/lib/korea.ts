// 남한 지도를 외부 지도 서비스(타일·API 키) 없이 그리기 위한 좌표 데이터와 투영 함수.
// 등거리 원통도법에 중위도(35.8°) 보정을 적용해 가로세로 비율을 맞춘다.

const BOUNDS = { lng0: 125.4, lng1: 130.1, lat0: 32.9, lat1: 38.75 };
const KX = Math.cos((35.8 * Math.PI) / 180);

export const VIEW_W = Number(((BOUNDS.lng1 - BOUNDS.lng0) * KX * 100).toFixed(2));
export const VIEW_H = Number(((BOUNDS.lat1 - BOUNDS.lat0) * 100).toFixed(2));

/** 위경도를 SVG viewBox 좌표로 변환한다. */
export function project(lat: number, lng: number): [number, number] {
  return [(lng - BOUNDS.lng0) * KX * 100, (BOUNDS.lat1 - lat) * 100];
}

/** 투영 좌표를 컨테이너 기준 퍼센트로 변환한다 (HTML 마커 배치용). */
export function projectPercent(lat: number, lng: number): { left: string; top: string } {
  const [x, y] = project(lat, lng);
  return { left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` };
}

type Ring = [number, number][];

/** 위경도 고리를 닫힌 SVG path 문자열로 만든다. */
export function ringToPath(ring: Ring): string {
  const d = ring
    .map(([lat, lng], i) => {
      const [x, y] = project(lat, lng);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join('');
  return `${d}Z`;
}

/** 두 지점 사이 대권 거리(km). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 남한 해안선 + 휴전선 (간략화)
export const MAINLAND: Ring = [
  [37.78, 126.68], [37.70, 126.42], [37.45, 126.52], [37.23, 126.63], [36.95, 126.60],
  [36.80, 126.14], [36.60, 126.32], [36.40, 126.50], [36.05, 126.55], [35.99, 126.72],
  [35.80, 126.60], [35.63, 126.45], [35.45, 126.48], [35.28, 126.40], [35.05, 126.35],
  [34.90, 126.28], [34.78, 126.38], [34.55, 126.30], [34.35, 126.45], [34.29, 126.56],
  [34.45, 126.75], [34.60, 126.98], [34.75, 127.15], [34.52, 127.28], [34.70, 127.45],
  [34.60, 127.70], [34.85, 127.78], [34.90, 128.05], [34.86, 128.43], [35.00, 128.60],
  [35.08, 128.85], [35.10, 129.05], [35.35, 129.28], [35.54, 129.38], [35.80, 129.47],
  [36.04, 129.42], [36.08, 129.57], [36.30, 129.42], [36.70, 129.45], [37.00, 129.43],
  [37.25, 129.35], [37.45, 129.17], [37.60, 129.12], [37.80, 128.93], [38.05, 128.72],
  [38.20, 128.59], [38.35, 128.45], [38.33, 128.36], [38.30, 128.10], [38.22, 127.75],
  [38.10, 127.42], [38.05, 127.10], [37.90, 126.95],
];

export const JEJU: Ring = [
  [33.56, 126.50], [33.52, 126.72], [33.45, 126.92], [33.33, 126.97], [33.24, 126.85],
  [33.20, 126.60], [33.23, 126.35], [33.32, 126.19], [33.46, 126.22],
];

/** 팀 연고지 — 원정 거리 계산 기준점. */
export const HOME = { city: '서울', lat: 37.5665, lng: 126.978 };
