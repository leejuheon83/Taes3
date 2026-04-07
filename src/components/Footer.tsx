import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/10">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Club info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/taes-logo.png" alt="TAES FC" width={52} height={52} className="rounded-full opacity-90" />
              <div>
                <div className="font-black text-white text-2xl tracking-wider">TAES FC</div>
                <div className="text-[#CC0000] text-xs font-bold tracking-widest">PREMIER</div>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              태즈 FC 프리미어반은 꿈을 향해 달리는 아이들의 축구 클럽입니다.<br />
              열정과 도전으로 함께 성장합니다.
            </p>
            <div className="flex gap-3">
              {['인스타그램', '유튜브', '카카오톡'].map((sns) => (
                <button
                  key={sns}
                  className="px-3 py-1.5 text-xs border border-white/20 text-white/60 hover:border-[#CC0000] hover:text-[#CC0000] transition-colors rounded"
                >
                  {sns}
                </button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">바로가기</h4>
            <ul className="space-y-2">
              {[
                { label: '공지사항', href: '/notice' },
                { label: '경기 일정', href: '/schedule' },
                { label: '사진 갤러리', href: '/gallery' },
                { label: '경기 영상', href: '/videos' },
                { label: '선수 등록', href: '/register' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 hover:text-[#CC0000] text-sm transition-colors flex items-center gap-2"
                  >
                    <span className="text-[#CC0000] text-xs">▶</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">연락처</h4>
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-2">
                <span className="text-[#CC0000] mt-0.5">📍</span>
                <span>서울특별시 ○○구<br />○○축구장</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#CC0000]">📞</span>
                <span>010-0000-0000</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#CC0000]">✉</span>
                <span>taes@example.com</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#CC0000]">⏰</span>
                <span>훈련: 주중 저녁, 주말 오전</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/30">
          <span>© 2025 TAES FC PREMIER. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white/60 transition-colors">개인정보처리방침</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
