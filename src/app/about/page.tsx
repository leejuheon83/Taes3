'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ClubInfo = {
  name: string;
  founded: string;
  location: string;
  grades: string;
  slogan: string;
  intro: string;
  philosophy: string;
  contact: string;
};

const STORAGE_KEY = 'taes-club-info-v1';

const defaultInfo: ClubInfo = {
  name: 'TAES FC PREMIER',
  founded: '2020',
  location: '서울특별시',
  grades: '1학년 · 3학년',
  slogan: '꿈을 향해 달리는 아이들의 축구 클럽',
  intro: 'TAES FC 프리미어는 아이들이 축구를 통해 건강하게 성장하고, 팀워크와 도전 정신을 배우는 커뮤니티 클럽입니다.\n\n실력보다 즐거움, 승리보다 성장을 먼저 생각합니다. 모든 선수가 경기장 안팎에서 최선을 다하고, 서로를 응원하는 문화를 만들어 갑니다.',
  philosophy: '⚽ 즐거운 축구\n모든 선수가 축구를 즐기며 경기에 임합니다.\n\n🤝 팀워크\n개인보다 팀을 먼저 생각하는 문화를 추구합니다.\n\n💪 도전과 성장\n결과보다 과정을 중요시하며 끊임없이 성장합니다.\n\n❤️ 가족 같은 공동체\n선수, 학부모, 코치가 함께하는 따뜻한 클럽입니다.',
  contact: 'taes@example.com',
};

function load(): ClubInfo {
  try { return { ...defaultInfo, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }; } catch { return defaultInfo; }
}
function save(info: ClubInfo) { localStorage.setItem(STORAGE_KEY, JSON.stringify(info)); }

export default function AboutPage() {
  const [info, setInfo] = useState<ClubInfo>(defaultInfo);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClubInfo>(defaultInfo);

  useEffect(() => { const d = load(); setInfo(d); setForm(d); }, []);

  function handleSave() {
    save(form);
    setInfo(form);
    setEditing(false);
  }

  const infoItems = [
    { label: '클럽명', value: info.name },
    { label: '창단연도', value: info.founded + '년' },
    { label: '활동 지역', value: info.location },
    { label: '학년 구성', value: info.grades },
    { label: '문의', value: info.contact },
  ];

  return (
    <div className="min-h-screen">
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>ABOUT</div>
          <h1 className="text-4xl font-black text-white mb-2">클럽 소개</h1>
          <p className="text-white/40 text-sm">{info.slogan}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {!editing ? (
          <>
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
              {infoItems.map(item => (
                <div key={item.label} className="border border-white/10 p-4 text-center" style={{ backgroundColor: '#111' }}>
                  <div className="text-xs text-white/40 mb-1">{item.label}</div>
                  <div className="text-white font-bold text-sm">{item.value}</div>
                </div>
              ))}
            </div>

            {/* 소개 */}
            <div className="mb-10">
              <h2 className="text-xl font-black text-white mb-1">클럽 소개</h2>
              <div className="section-divider mb-5" />
              <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
                {info.intro}
              </div>
            </div>

            {/* 클럽 철학 */}
            <div className="mb-10">
              <h2 className="text-xl font-black text-white mb-1">클럽 철학</h2>
              <div className="section-divider mb-5" />
              <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
                {info.philosophy}
              </div>
            </div>

            {/* 코칭스태프 링크 */}
            <div className="border border-white/10 p-6 flex items-center justify-between" style={{ backgroundColor: '#111' }}>
              <div>
                <div className="text-white font-bold mb-1">코칭스태프</div>
                <div className="text-white/40 text-sm">감독·코치진을 소개합니다</div>
              </div>
              <Link href="/about/staff" className="px-5 py-2 text-sm font-bold text-white hover:opacity-80 transition-colors" style={{ backgroundColor: '#CC0000' }}>
                바로가기 →
              </Link>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setEditing(true)} className="px-6 py-2.5 text-sm font-bold text-white/60 border border-white/10 hover:border-white/30 hover:text-white transition-colors">
                ✏️ 내용 수정
              </button>
            </div>
          </>
        ) : (
          /* 수정 폼 */
          <div className="border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
            <h2 className="text-lg font-black text-white mb-6">클럽 정보 수정</h2>
            <div className="space-y-4">
              {([
                { key: 'name', label: '클럽명' },
                { key: 'founded', label: '창단연도' },
                { key: 'location', label: '활동 지역' },
                { key: 'grades', label: '학년 구성' },
                { key: 'slogan', label: '슬로건' },
                { key: 'contact', label: '문의 이메일' },
              ] as { key: keyof ClubInfo; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-white/50 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none"
                    style={{ backgroundColor: '#1a1a1a' }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">클럽 소개</label>
                <textarea
                  value={form.intro}
                  onChange={e => setForm(f => ({ ...f, intro: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none resize-none"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1">클럽 철학</label>
                <textarea
                  value={form.philosophy}
                  onChange={e => setForm(f => ({ ...f, philosophy: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 text-white text-sm border border-white/10 focus:border-red-600 outline-none resize-none"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm font-bold text-white/50 border border-white/10 hover:border-white/30 transition-colors">취소</button>
              <button onClick={handleSave} className="flex-1 py-2 text-sm font-bold text-white hover:opacity-80 transition-colors" style={{ backgroundColor: '#CC0000' }}>저장</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
