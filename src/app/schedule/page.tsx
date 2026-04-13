'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';

type Match = {
  id: number;
  date: string;
  day: string;
  time: string;
  home: string;
  away: string;
  venue: string;
  grade: string;
  result: '승' | '무' | '패' | null;
  homeScore: number | null;
  awayScore: number | null;
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const defaultMatches: Match[] = [
  { id: 1, date: '2025-04-12', day: '토', time: '10:00', home: 'TAES FC', away: '드래곤 FC', venue: '○○구장 1경기장', grade: '3학년', result: null, homeScore: null, awayScore: null },
  { id: 2, date: '2025-04-12', day: '토', time: '14:00', home: 'TAES FC', away: '블루 스타', venue: '○○구장 2경기장', grade: '1학년', result: null, homeScore: null, awayScore: null },
  { id: 3, date: '2025-04-19', day: '토', time: '10:00', home: 'TAES FC', away: '스타 유나이티드', venue: '△△구장', grade: '1학년', result: null, homeScore: null, awayScore: null },
  { id: 4, date: '2025-04-26', day: '일', time: '11:00', home: '블루 FC', away: 'TAES FC', venue: '□□구장', grade: '3학년', result: null, homeScore: null, awayScore: null },
  { id: 5, date: '2025-05-03', day: '토', time: '10:00', home: 'TAES FC', away: '그린 유스', venue: '○○구장 1경기장', grade: '1학년', result: null, homeScore: null, awayScore: null },
  { id: 6, date: '2025-03-29', day: '토', time: '10:00', home: 'TAES FC', away: '레드 스타', venue: '○○구장', grade: '3학년', result: '승', homeScore: 3, awayScore: 1 },
  { id: 7, date: '2025-03-22', day: '토', time: '14:00', home: '그린 FC', away: 'TAES FC', venue: '△△구장', grade: '1학년', result: '승', homeScore: 1, awayScore: 2 },
  { id: 8, date: '2025-03-15', day: '토', time: '10:00', home: 'TAES FC', away: '화이트 유나이티드', venue: '○○구장', grade: '3학년', result: '무', homeScore: 1, awayScore: 1 },
  { id: 9, date: '2025-03-08', day: '토', time: '11:00', home: '블랙 FC', away: 'TAES FC', venue: '□□구장', grade: '3학년', result: '패', homeScore: 2, awayScore: 0 },
  { id: 10, date: '2025-03-01', day: '토', time: '10:00', home: 'TAES FC', away: '오렌지 FC', venue: '○○구장', grade: '1학년', result: '승', homeScore: 4, awayScore: 2 },
];

const emptyForm = {
  date: '',
  time: '10:00',
  home: 'TAES FC',
  away: '',
  venue: '',
  hasResult: false,
  result: '' as '' | '승' | '무' | '패',
  homeScore: '',
  awayScore: '',
};

const resultColors: Record<string, string> = { 승: '#16a34a', 패: '#dc2626', 무: '#6b7280' };

function getDayFromDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return DAYS[d.getDay()];
}

export default function SchedulePage() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('taes-matches');
    setMatches(saved ? JSON.parse(saved) : defaultMatches);
  }, []);

  const save = (updated: Match[]) => {
    setMatches(updated);
    localStorage.setItem('taes-matches', JSON.stringify(updated));
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const exportICS = () => {
    const upcoming = matches.filter(m => m.result === null).sort((a, b) => a.date.localeCompare(b.date));
    if (!upcoming.length) { alert('내보낼 예정 경기가 없습니다.'); return; }
    const pad = (n: number) => String(n).padStart(2, '0');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TAES FC PREMIER//Schedule//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    upcoming.forEach(m => {
      const [y, mo, d] = m.date.split('-').map(Number);
      const [h, min] = m.time.split(':').map(Number);
      const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(min)}00`;
      const dtEnd = `${y}${pad(mo)}${pad(d)}T${pad(h + 1)}${pad(min)}00`;
      lines.push(
        'BEGIN:VEVENT',
        `DTSTART;TZID=Asia/Seoul:${dtStart}`,
        `DTEND;TZID=Asia/Seoul:${dtEnd}`,
        `SUMMARY:${m.home} vs ${m.away}`,
        `LOCATION:${m.venue}`,
        `DESCRIPTION:TAES FC PREMIER 경기`,
        `UID:taes-${m.id}@taes-fc`,
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'taes-fc-schedule.ics';
    a.click(); URL.revokeObjectURL(url);
  };

  const openEdit = (m: Match) => {
    setEditId(m.id);
    setForm({
      date: m.date,
      time: m.time,
      home: m.home,
      away: m.away,
      venue: m.venue,
      hasResult: m.result !== null,
      result: m.result ?? '',
      homeScore: m.homeScore?.toString() ?? '',
      awayScore: m.awayScore?.toString() ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = getDayFromDate(form.date);
    const hasResult = form.hasResult && form.result !== '';

    const matchData = {
      date: form.date,
      day,
      time: form.time,
      home: form.home,
      away: form.away,
      venue: form.venue,
      grade: '',
      result: hasResult ? (form.result as '승' | '무' | '패') : null,
      homeScore: hasResult ? Number(form.homeScore) : null,
      awayScore: hasResult ? Number(form.awayScore) : null,
    };

    if (editId !== null) {
      save(matches.map((m) => m.id === editId ? { ...matchData, id: editId } : m));
    } else {
      const newId = Math.max(0, ...matches.map((m) => m.id)) + 1;
      save([...matches, { ...matchData, id: newId }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    save(matches.filter((m) => m.id !== id));
    setDeleteId(null);
  };

  const filtered = matches.filter((m) => {
    const matchTab = activeTab === 'upcoming' ? m.result === null : m.result !== null;
    return matchTab;
  }).sort((a, b) => {
    if (activeTab === 'upcoming') return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date);
  });

  const completed = matches.filter((m) => m.result !== null);
  const wins = completed.filter((m) => m.result === '승').length;
  const draws = completed.filter((m) => m.result === '무').length;
  const losses = completed.filter((m) => m.result === '패').length;
  const totalGoalsFor = completed.reduce((sum, m) =>
    sum + (m.home === 'TAES FC' ? (m.homeScore ?? 0) : (m.awayScore ?? 0)), 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-end justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>SCHEDULE</div>
            <h1 className="text-4xl font-black text-white mb-2">경기 일정 · 결과</h1>
            <p className="text-white/40 text-sm">2025 시즌 경기 일정 및 결과입니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportICS}
              className="flex items-center gap-2 px-4 py-2.5 font-bold text-sm border border-white/20 hover:border-white/40 transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              title="예정 경기를 캘린더 앱으로 내보내기"
            >
              📅 캘린더 내보내기
            </button>
            <button
              onClick={() => requireAdmin(openAdd)}
              className="flex items-center gap-2 px-5 py-2.5 font-bold text-white text-sm transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#CC0000' }}
            >
              + 경기 등록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Season record — 도넛 차트 */}
        {(() => {
          const total = wins + draws + losses;
          const r = 54, cx = 64, cy = 64, stroke = 14;
          const circ = 2 * Math.PI * r;
          const wPct = total ? wins / total : 0;
          const dPct = total ? draws / total : 0;
          const lPct = total ? losses / total : 0;
          const wLen = circ * wPct, dLen = circ * dPct, lLen = circ * lPct;
          const wOff = 0, dOff = -(circ - wLen), lOff = -(circ - wLen - dLen);
          const winRate = total ? Math.round((wins / total) * 100) : 0;
          return (
            <div className="flex flex-col sm:flex-row items-center gap-8 p-6 mb-10 border border-white/10" style={{ backgroundColor: '#0e0e0e' }}>
              {/* 도넛 */}
              <div className="relative flex-shrink-0">
                <svg width={128} height={128} viewBox="0 0 128 128">
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222" strokeWidth={stroke} />
                  {total === 0 ? (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#333" strokeWidth={stroke} />
                  ) : (
                    <>
                      {/* 승 */}
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16a34a" strokeWidth={stroke}
                        strokeDasharray={`${wLen} ${circ - wLen}`} strokeDashoffset={circ / 4} strokeLinecap="butt" />
                      {/* 무 */}
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6b7280" strokeWidth={stroke}
                        strokeDasharray={`${dLen} ${circ - dLen}`} strokeDashoffset={circ / 4 + dOff} strokeLinecap="butt" />
                      {/* 패 */}
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#dc2626" strokeWidth={stroke}
                        strokeDasharray={`${lLen} ${circ - lLen}`} strokeDashoffset={circ / 4 + lOff} strokeLinecap="butt" />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-black text-white">{winRate}%</div>
                  <div className="text-[10px] text-white/40 font-bold">승률</div>
                </div>
              </div>
              {/* 수치 */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {[
                  { label: '승', value: wins, color: '#16a34a' },
                  { label: '무', value: draws, color: '#6b7280' },
                  { label: '패', value: losses, color: '#dc2626' },
                  { label: '득점', value: totalGoalsFor, color: '#CC0000' },
                ].map(s => (
                  <div key={s.label} className="text-center py-4 border border-white/5 rounded" style={{ backgroundColor: '#0d0d0d' }}>
                    <div className="text-3xl font-black mb-0.5" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-white/40 text-xs font-bold">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-white/10">
          {(['upcoming', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-8 py-3 font-bold text-sm transition-colors border-b-2"
              style={{
                color: activeTab === tab ? '#CC0000' : 'rgba(255,255,255,0.4)',
                borderBottomColor: activeTab === tab ? '#CC0000' : 'transparent',
              }}
            >
              {tab === 'upcoming' ? '예정 경기' : '경기 결과'}
            </button>
          ))}
        </div>

        {/* Match list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-white/30 border border-white/10" style={{ backgroundColor: '#0e0e0e' }}>
              경기가 없습니다.
            </div>
          ) : (
            filtered.map((m) => (
              <div
                key={m.id}
                className="border transition-all"
                style={{ backgroundColor: '#0e0e0e', borderColor: m.result ? 'rgba(255,255,255,0.05)' : 'rgba(204,0,0,0.2)' }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                  {/* Date */}
                  <div className="flex-shrink-0 text-center sm:w-20">
                    <div className="text-white font-black text-lg">{m.date.slice(5).replace('-', '.')}</div>
                    <div className="text-white/40 text-xs">{m.day}요일 {m.time}</div>
                  </div>

                  {/* Match */}
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    <span className={`font-black text-base sm:text-lg ${m.home === 'TAES FC' ? 'text-white' : 'text-white/50'}`}>
                      {m.home}
                    </span>
                    {m.result !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white px-4 py-1" style={{ backgroundColor: '#121212' }}>
                          {m.homeScore} : {m.awayScore}
                        </span>
                        <span className="text-white text-xs font-black px-2 py-1" style={{ backgroundColor: resultColors[m.result] }}>
                          {m.result}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold px-4 py-1"
                        style={{ color: '#CC0000', backgroundColor: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)' }}>
                        VS
                      </span>
                    )}
                    <span className={`font-black text-base sm:text-lg ${m.away === 'TAES FC' ? 'text-white' : 'text-white/50'}`}>
                      {m.away}
                    </span>
                  </div>

                  {/* Venue + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right text-xs text-white/30">
                      <div>📍 {m.venue}</div>
                      {!m.result && (
                        <div className="mt-1">
                          <span className="text-white text-[10px] font-bold px-2 py-0.5" style={{ backgroundColor: '#CC0000' }}>예정</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => requireAdmin(() => openEdit(m))}
                        className="text-[10px] font-bold px-2 py-1 text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => requireAdmin(() => setDeleteId(m.id))}
                        className="text-[10px] font-bold px-2 py-1 hover:text-white border border-red-900/30 hover:border-red-600 transition-colors"
                        style={{ color: '#dc2626' }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg border border-white/10 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#0e0e0e' }}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-black text-white">{editId !== null ? '경기 수정' : '경기 등록'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">날짜 *</label>
                  <input type="date" required value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white focus:border-red-700 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">시간 *</label>
                  <input type="time" required value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white focus:border-red-700 outline-none text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">홈팀 *</label>
                  <input required value={form.home} onChange={(e) => setForm((f) => ({ ...f, home: e.target.value }))}
                    placeholder="TAES FC"
                    className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">원정팀 *</label>
                  <input required value={form.away} onChange={(e) => setForm((f) => ({ ...f, away: e.target.value }))}
                    placeholder="상대팀명"
                    className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs mb-1.5 font-semibold">경기장 *</label>
                <input required value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                  placeholder="경기장 이름"
                  className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none text-sm" />
              </div>

              {/* Result toggle */}
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <input type="checkbox" checked={form.hasResult}
                  onChange={(e) => setForm((f) => ({ ...f, hasResult: e.target.checked }))}
                  className="w-4 h-4" style={{ accentColor: '#CC0000' }} />
                <span className="text-white/70 text-sm font-semibold">경기 결과 입력</span>
              </label>

              {form.hasResult && (
                <div className="space-y-3 p-4 border border-white/10" style={{ backgroundColor: '#0f0f0f' }}>
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5 font-semibold">결과 *</label>
                    <div className="flex gap-2">
                      {(['승', '무', '패'] as const).map((r) => (
                        <button key={r} type="button"
                          onClick={() => setForm((f) => ({ ...f, result: r }))}
                          className="flex-1 py-2 text-sm font-black transition-colors"
                          style={{
                            backgroundColor: form.result === r ? resultColors[r] : '#121212',
                            color: form.result === r ? '#fff' : 'rgba(255,255,255,0.4)',
                            border: `1px solid ${form.result === r ? resultColors[r] : 'rgba(255,255,255,0.1)'}`,
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5 font-semibold">홈 득점</label>
                      <input type="number" min="0" value={form.homeScore}
                        onChange={(e) => setForm((f) => ({ ...f, homeScore: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white focus:border-red-700 outline-none text-sm text-center" />
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5 font-semibold">원정 득점</label>
                      <input type="number" min="0" value={form.awayScore}
                        onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 text-white focus:border-red-700 outline-none text-sm text-center" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors text-sm">
                  취소
                </button>
                <button type="submit"
                  className="flex-1 py-3 font-bold text-white hover:opacity-80 transition-opacity text-sm"
                  style={{ backgroundColor: '#CC0000' }}>
                  {editId !== null ? '수정 완료' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#0e0e0e' }}>
            <h3 className="text-white font-black text-lg mb-2">경기 삭제</h3>
            <p className="text-white/50 text-sm mb-6">이 경기를 삭제하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors text-sm">
                취소
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 font-bold text-white hover:opacity-80 transition-opacity text-sm"
                style={{ backgroundColor: '#dc2626' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {adminModal}
    </div>
  );
}
