// 사진이 배경을 지운 이미지(투명 배경)인지 짐작한다.
// JPEG는 투명도를 담을 수 없으므로 배경이 있는 일반 사진으로 본다.
// 배경이 있는 사진은 네모난 가장자리를 타원으로 흐려 프레임에 녹여야 한다.
export function hasCutoutBackground(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith('data:')) return !/^data:image\/jpe?g/i.test(src);
  return !/\.jpe?g(\?|#|$)/i.test(src);
}

// 카드 사진에 붙일 class를 돌려준다.
export function shotClass(src: string | null | undefined): string {
  return hasCutoutBackground(src) ? 'fcard__shot' : 'fcard__shot is-photo';
}
