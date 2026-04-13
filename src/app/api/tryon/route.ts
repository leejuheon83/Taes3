import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const { humanImage } = await req.json();

    if (!humanImage) {
      return NextResponse.json({ error: '사진이 없습니다.' }, { status: 400 });
    }

    // 유니폼 이미지를 public 폴더에서 base64로 읽기
    const jerseyPath = path.join(process.cwd(), 'public', 'taes-jersey.jpg');
    let garmImage: string;

    if (fs.existsSync(jerseyPath)) {
      const jerseyBuffer = fs.readFileSync(jerseyPath);
      garmImage = `data:image/jpeg;base64,${jerseyBuffer.toString('base64')}`;
    } else {
      return NextResponse.json({ error: '유니폼 이미지를 찾을 수 없습니다. public/taes-jersey.jpg 를 확인해주세요.' }, { status: 400 });
    }

    const output = await replicate.run(
      'cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
      {
        input: {
          human_img: humanImage,
          garm_img: garmImage,
          garment_des: 'TAES FC red soccer jersey uniform',
          is_checked: true,
          is_checked_crop: false,
          denoise_steps: 30,
          seed: 42,
        },
      }
    );

    return NextResponse.json({ result: output });
  } catch (err: unknown) {
    console.error('Tryon error:', err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
