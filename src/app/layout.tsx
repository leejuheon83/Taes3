import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "TAES FC PREMIER | 태즈 FC 프리미어",
  description: "태즈 FC 프리미어반 공식 홈페이지. 공지사항, 경기일정, 사진 및 영상 갤러리, 학년별 선수등록.",
  manifest: '/manifest.json',
  icons: {
    icon: '/taes-logo.png',
    apple: '/taes-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TAES FC',
  },
};

export const viewport: Viewport = {
  themeColor: '#CC0000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col text-white antialiased" style={{ backgroundColor: '#080808' }}>
        <PWARegister />
        <Navbar />
        <main className="flex-1 pt-[88px]">
          {children}
        </main>
      </body>
    </html>
  );
}
