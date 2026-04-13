import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TAES FC PREMIER | 태즈 FC 프리미어",
  description: "태즈 FC 프리미어반 공식 홈페이지. 공지사항, 경기일정, 사진 및 영상 갤러리, 학년별 선수등록.",
  icons: { icon: '/taes-logo.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col text-white antialiased" style={{ backgroundColor: '#080808' }}>
        <Navbar />
        <main className="flex-1 pt-[88px]">
          {children}
        </main>
      </body>
    </html>
  );
}
