import { NextRequest, NextResponse } from 'next/server';

// 브라우저에서 Firebase Storage로 직접 fetch하면 CORS에 막히므로 서버가 대신 받아온다.
// (Storage 다운로드 URL은 CORS 헤더를 주지 않아 <img> 표시는 되어도 fetch는 실패한다)

const ALLOWED_HOST = 'firebasestorage.googleapis.com';
const ALLOWED_BUCKET = 'taes-fc.firebasestorage.app';
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'url 파라미터가 없습니다.' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: '올바른 URL이 아닙니다.' }, { status: 400 });
  }

  // SSRF 방지: 이 프로젝트의 Storage 버킷 주소만 허용
  if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST
    || !target.pathname.startsWith(`/v0/b/${ALLOWED_BUCKET}/o/`)) {
    return NextResponse.json({ error: '허용되지 않은 주소입니다.' }, { status: 403 });
  }

  try {
    const res = await fetch(target.toString(), { cache: 'no-store' });
    if (!res.ok) {
      const detail = res.status === 402 || res.status === 403
        ? 'Storage 접근이 거부되었습니다. Firebase 요금제가 Blaze인지 확인해 주세요.'
        : `Storage 응답 오류 (HTTP ${res.status})`;
      return NextResponse.json({ error: detail, status: res.status }, { status: 502 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: '사진 용량이 너무 큽니다.' }, { status: 413 });
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    return NextResponse.json({
      dataUrl: `data:${contentType};base64,${buf.toString('base64')}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `사진을 가져오지 못했습니다: ${message}` }, { status: 502 });
  }
}
