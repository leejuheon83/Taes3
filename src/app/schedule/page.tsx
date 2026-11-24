'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClubIcon from '@/components/ClubIcon';
import './schedule.css';
import { useAdminAuth } from '@/components/AdminAuth';
import { SkeletonRows } from '@/components/Skeleton';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, updateDoc, deleteField, orderBy, query
} from 'firebase/firestore';

type Match = {
  id: string;
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
  /** 승부차기 점수. 승부차기까지 간 경기에만 있다. */
  homePk?: number;
  awayPk?: number;
  tournamentId?: string;
};

type TournamentRef = { id: string; name: string; from: string; to: string; stage?: string; venue?: string };

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];


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
  hasPk: false,
  homePk: '',
  awayPk: '',
};

const resultColors: Record<string, string> = { 승: '#16a34a', 패: '#dc2626', 무: '#6b7280' };

/** 승부차기 점수가 양쪽 모두 들어오면, TAES 기준으로 결과(승·패)를 맞춘다. */
function withPkResult<F extends { home: string; homePk: string; awayPk: string; result: '' | '승' | '무' | '패' }>(f: F): F {
  if (f.homePk === '' || f.awayPk === '') return f;
  const h = Number(f.homePk), a = Number(f.awayPk);
  if (h === a) return f;
  const taesIsHome = f.home.includes('TAES');
  return { ...f, result: (h > a) === taesIsHome ? '승' : '패' };
}

/** 승부차기 점수가 양쪽 모두 기록된 경기인지 */
const hasPk = (m: { homePk?: number; awayPk?: number }) => m.homePk != null && m.awayPk != null;

/** 대회 연결이 있는 경우에만 tournamentId를 담은 객체를 돌려준다 (undefined 필드 저장 방지) */
function pickTournamentId(m?: Match) {
  return m?.tournamentId ? { tournamentId: m.tournamentId } : {};
}

function getDayFromDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return DAYS[d.getDay()];
}

export default function SchedulePage() {
  return <Suspense fallback={<SkeletonRows count={5} height={92} />}><ScheduleContent /></Suspense>;
}

function ScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requireAdmin, modal: adminModal } = useAdminAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const activeTab = searchParams.get('tab') === 'results' ? 'results' : 'upcoming';
  const [season, setSeason] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 대회 연결
  const [tournaments, setTournaments] = useState<TournamentRef[]>([]);
  const [linkMatch, setLinkMatch] = useState<Match | null>(null);

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      try {
        const q = query(collection(db, 'matches'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        const loaded: Match[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Match, 'id'>),
        }));
        setMatches(loaded);
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    }
    async function loadTournaments() {
      try {
        const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('from', 'desc')));
        setTournaments(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TournamentRef, 'id'>) })));
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      }
    }
    loadMatches();
    loadTournaments();
  }, []);

  /** 경기 하나의 대회 연결을 바꾼다. 경기 기록 자체는 건드리지 않는다. */
  async function setMatchTournament(matchId: string, tournamentId: string | null) {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        tournamentId: tournamentId ?? deleteField(),
      });
      setMatches(prev => prev.map(m =>
        m.id === matchId ? { ...m, tournamentId: tournamentId ?? undefined } : m));
      setLinkMatch(null);
    } catch (err) {
      console.error('Failed to link tournament:', err);
      alert('대회 연결에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

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
      hasPk: m.homePk != null && m.awayPk != null,
      homePk: m.homePk?.toString() ?? '',
      awayPk: m.awayPk?.toString() ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasResult = form.hasResult;
    // 승부차기: 두 칸을 모두 채워야 하고, 동점으로 끝날 수 없다
    const hasPk = hasResult && form.hasPk;
    if (hasPk) {
      if (form.homePk === '' || form.awayPk === '') { alert('승부차기 점수를 양쪽 모두 입력해 주세요.'); return; }
      if (Number(form.homePk) === Number(form.awayPk)) { alert('승부차기는 동점으로 끝날 수 없습니다. 점수를 확인해 주세요.'); return; }
    }
    // 결과 입력을 켰으면 승·무·패와 득점이 있어야 한다.
    // (예전에는 승·무·패를 고르지 않으면 입력한 점수가 말없이 버려지고 예정 경기로 저장됐다)
    if (hasResult) {
      if (form.result === '') { alert('결과(승·무·패)를 선택해 주세요.'); return; }
      if (form.homeScore === '' || form.awayScore === '') { alert('홈과 원정 득점을 모두 입력해 주세요.'); return; }
    }
    setSaving(true);
    try {
      const day = getDayFromDate(form.date);

      const matchData: Omit<Match, 'id'> = {
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
        // 승부차기가 없으면 항목 자체를 저장하지 않는다 (setDoc이 통째로 덮어써 예전 값도 지워진다)
        ...(hasPk ? { homePk: Number(form.homePk), awayPk: Number(form.awayPk) } : {}),
        // setDoc은 문서를 통째로 덮어쓰므로 기존 대회 연결을 직접 넘겨줘야 한다
        ...(editId ? pickTournamentId(matches.find(m => m.id === editId)) : {}),
      };

      if (editId !== null) {
        await setDoc(doc(db, 'matches', editId), matchData);
        setMatches(prev => prev.map(m => m.id === editId ? { id: editId, ...matchData } : m));
      } else {
        const id = String(Date.now());
        await setDoc(doc(db, 'matches', id), matchData);
        setMatches(prev => [...prev, { id, ...matchData }]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save match:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'matches', id));
      setMatches(prev => prev.filter(m => m.id !== id));
      setDeleteId(null);
    } catch (err) {
      console.error('Failed to delete match:', err);
      alert('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const years = [...new Set(matches.map(m => m.date.slice(0,4)))].sort().reverse();
  const seasonMatches = matches.filter(m => season === 'all' || m.date.startsWith(season));
  const filtered = seasonMatches.filter((m) => {
    const matchTab = activeTab === 'upcoming' ? m.result === null : m.result !== null;
    return matchTab && (activeTab !== 'results' || resultFilter === 'all' || m.result === resultFilter);
  }).sort((a, b) => {
    if (activeTab === 'upcoming') return a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');
    return b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '');
  });

  const completed = seasonMatches.filter((m) => m.result !== null);
  const wins = completed.filter((m) => m.result === '승').length;
  const draws = completed.filter((m) => m.result === '무').length;
  const losses = completed.filter((m) => m.result === '패').length;
  const totalGoalsFor = completed.reduce((sum, m) =>
    sum + (m.home === 'TAES FC' ? (m.homeScore ?? 0) : (m.awayScore ?? 0)), 0);
  const total = completed.length;
  const winRate = total ? Math.round(wins / total * 100) : 0;
  const groups = new Map<string, { tournament?: TournamentRef; matches: Match[] }>();
  filtered.forEach(m => {
    const tournament = tournaments.find(t => t.id === m.tournamentId);
    const key = tournament ? tournament.id : `date-${m.date}`;
    if (!groups.has(key)) groups.set(key, { tournament, matches: [] });
    groups.get(key)!.matches.push(m);
  });
  function manageMatch(e: React.MouseEvent<HTMLButtonElement>, action: () => void) {
    e.currentTarget.closest('details')?.removeAttribute('open');
    action();
  }

  return (
    <div className="schedule-center min-h-screen">
      <div className="sc-shell">
        <header className="sc-heading">
          <div><div className="sc-eyebrow">MATCH CENTER</div><h1>경기 일정 <span>·</span> 결과</h1><p>함께 뛴 경기, 차곡차곡 쌓이는 우리 팀의 기록.</p></div>
          <div className="sc-actions">
            <button className="sc-button" onClick={exportICS} title="예정 경기를 캘린더 앱으로 내보내기"><ClubIcon name="calendar" />캘린더 내보내기</button>
            <button className="sc-button sc-primary" onClick={() => requireAdmin(openAdd)}><ClubIcon name="plus" />경기 등록</button>
          </div>
        </header>
        <section className="sc-overview" aria-label="선택한 시즌 통계" aria-busy={loading}>
          <div className="sc-metric sc-winrate">
            <div className="sc-ring" aria-hidden="true" style={{ background: total ? `conic-gradient(#58b981 0 ${wins / total * 100}%, #48515f ${wins / total * 100}% ${(wins + draws) / total * 100}%, #b94a54 ${(wins + draws) / total * 100}% 100%)` : '#303945' }} />
            <span>{season === 'all' ? '전체 승률' : `${season} 승률`}</span><strong>{loading ? '—' : winRate}<small>%</small></strong>
          </div>
          {[
            { label:'승리', value:wins, unit:'승', tone:'win' },
            { label:'무승부', value:draws, unit:'무', tone:'draw' },
            { label:'패배', value:losses, unit:'패', tone:'loss' },
            { label:'총 득점', value:totalGoalsFor, unit:'골', tone:'' },
          ].map(s => <div key={s.label} className={`sc-metric ${s.tone}`}><span>{s.label}</span><strong>{loading ? '—' : s.value}<small>{s.unit}</small></strong></div>)}
        </section>
        <div className="sc-toolbar">
          <div className="sc-tabs" role="tablist" aria-label="경기 종류">
            {(['upcoming','results'] as const).map(tab => <button key={tab} id={`sc-tab-${tab}`} role="tab" aria-selected={activeTab === tab} aria-controls="sc-match-panel" tabIndex={activeTab === tab ? 0 : -1}
              onKeyDown={e => { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'upcoming' : e.key === 'End' ? 'results' : tab === 'upcoming' ? 'results' : 'upcoming'; document.getElementById(`sc-tab-${next}`)?.focus(); const params = new URLSearchParams(searchParams.toString()); params.set('tab',next); router.replace(`?${params}`,{scroll:false}); } }}
              onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.set('tab',tab); router.replace(`?${params}`,{scroll:false}); }}
              className={activeTab === tab ? 'active' : ''}>{tab === 'upcoming' ? '예정 경기' : '경기 결과'}<small>{seasonMatches.filter(m => tab === 'upcoming' ? m.result === null : m.result !== null).length}</small></button>)}
          </div>
          <div className="sc-filters">
            <select aria-label="시즌 선택" value={season} onChange={e => setSeason(e.target.value)}><option value="all">전체 시즌</option>{years.map(y => <option key={y} value={y}>{y} 시즌</option>)}</select>
            {activeTab === 'results' && <select aria-label="경기 결과 필터" value={resultFilter} onChange={e => setResultFilter(e.target.value)}><option value="all">전체 결과</option><option value="승">승리</option><option value="무">무승부</option><option value="패">패배</option></select>}
          </div>
        </div>
        <section id="sc-match-panel" role="tabpanel" aria-labelledby={`sc-tab-${activeTab}`} tabIndex={0}>
          <div className="sc-list-heading"><h2>{activeTab === 'results' ? '최근 경기 결과' : '다가오는 경기'}</h2><span>{activeTab === 'results' ? '최신순' : '날짜순'} · 대회별 보기</span></div>
          {loading ? <SkeletonRows count={5} height={92} /> : !filtered.length ? <div className="sc-empty">{activeTab === 'upcoming' ? '예정된 경기가 없습니다.' : '조건에 맞는 경기 결과가 없습니다.'}</div> : [...groups.entries()].map(([key,group]) => {
            const {tournament} = group;
            const dates = [...new Set(group.matches.map(m => m.date))].sort();
            const range = dates.length > 1 ? `${dates[0].replace(/-/g,'.')} – ${dates[dates.length-1].slice(5).replace('-','.')}` : dates[0].replace(/-/g,'.');
            return <section key={key} className="sc-group" aria-label={tournament?.name ?? '연습·친선 경기'}>
              <header className="sc-group-heading"><div className="sc-group-title"><span className="sc-cup"><ClubIcon name={tournament ? 'cup' : 'ball'} /></span><div><h3>{tournament?.name ?? '연습·친선 경기'}</h3><p>{range}{tournament?.venue ? ` · ${tournament.venue}` : ''}</p></div></div>{activeTab === 'results' && tournament?.stage && <span className="sc-stage">{tournament.stage}</span>}</header>
              {group.matches.map(m => <article key={m.id} className="sc-match">
                <div className="sc-date"><strong>{m.date.slice(5).replace('-','.')}</strong><small>{m.day || getDayFromDate(m.date)}요일{m.time ? ` · ${m.time}` : ''}</small></div>
                <div className="sc-teams"><span className={m.home === 'TAES FC' ? 'sc-team-home' : 'sc-team'}>{m.home}</span>
                  <div className={`sc-score ${m.result ? '' : 'sc-versus'}`} aria-label={m.result ? `${m.homeScore ?? '미입력'} 대 ${m.awayScore ?? '미입력'}${hasPk(m) ? `, 승부차기 ${m.homePk} 대 ${m.awayPk}` : ''}` : '대결 예정'}>{m.result ? <><span>{m.homeScore ?? '—'}</span><i>:</i><span>{m.awayScore ?? '—'}</span>{hasPk(m) && <small className="sc-pk">PK {m.homePk}:{m.awayPk}</small>}</> : 'VS'}</div>
                  <div className="sc-opponent"><span className={m.away === 'TAES FC' ? 'sc-team-home' : 'sc-team'}>{m.away}</span>{m.result && <span className={`sc-result ${m.result === '승' ? 'won' : m.result === '패' ? 'lost' : 'drawn'}`}>{m.result}</span>}</div>
                </div>
                <div className="sc-venue">{m.venue || '경기장 미정'}{!m.result && <span>예정</span>}</div>
                <details className="sc-management" name="match-management" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
                  <summary aria-label={`${m.date} ${m.home} 대 ${m.away} 경기 관리`}>···</summary>
                  <div className="sc-management-menu">
                    <button onClick={e => manageMatch(e, () => requireAdmin(() => setLinkMatch(m)))}><ClubIcon name="cup" />대회 연결</button>
                    <button onClick={e => manageMatch(e, () => requireAdmin(() => openEdit(m), {reconfirm:true}))}><ClubIcon name="edit" />수정</button>
                    <button className="sc-delete" onClick={e => manageMatch(e, () => requireAdmin(() => setDeleteId(m.id), {reconfirm:true}))}><ClubIcon name="trash" />삭제</button>
                  </div>
                </details>
              </article>)}
            </section>;
          })}
        </section>
      </div>
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg border border-white/10 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#080808' }}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg section-title">{editId !== null ? '경기 수정' : '경기 등록'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">날짜 *</label>
                  <input type="date" required value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white focus:border-red-700 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">시간 *</label>
                  <input type="time" required value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white focus:border-red-700 outline-none text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">홈팀 *</label>
                  <input required value={form.home} onChange={(e) => setForm((f) => ({ ...f, home: e.target.value }))}
                    placeholder="TAES FC"
                    className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 font-semibold">원정팀 *</label>
                  <input required value={form.away} onChange={(e) => setForm((f) => ({ ...f, away: e.target.value }))}
                    placeholder="상대팀명"
                    className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs mb-1.5 font-semibold">경기장 *</label>
                <input required value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                  placeholder="경기장 이름"
                  className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none text-sm" />
              </div>

              {/* Result toggle */}
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <input type="checkbox" checked={form.hasResult}
                  onChange={(e) => setForm((f) => ({ ...f, hasResult: e.target.checked }))}
                  className="w-4 h-4" style={{ accentColor: '#CC0000' }} />
                <span className="text-white/70 text-sm font-semibold">경기 결과 입력</span>
              </label>

              {form.hasResult && (
                <div className="space-y-3 p-4 border border-white/10" style={{ backgroundColor: '#080808' }}>
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5 font-semibold">결과 *</label>
                    <div className="flex gap-2">
                      {(['승', '무', '패'] as const).map((r) => (
                        <button key={r} type="button"
                          onClick={() => setForm((f) => ({ ...f, result: r }))}
                          className="flex-1 py-2 text-sm font-black transition-colors"
                          style={{
                            backgroundColor: form.result === r ? resultColors[r] : '#0e0e0e',
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
                        className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white focus:border-red-700 outline-none text-sm text-center" />
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5 font-semibold">원정 득점</label>
                      <input type="number" min="0" value={form.awayScore}
                        onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white focus:border-red-700 outline-none text-sm text-center" />
                    </div>
                  </div>

                  {/* 승부차기 */}
                  <label className="flex items-center gap-3 cursor-pointer pt-1">
                    <input id="match-has-pk" type="checkbox" checked={form.hasPk}
                      onChange={(e) => setForm((f) => ({ ...f, hasPk: e.target.checked }))}
                      className="w-4 h-4" style={{ accentColor: '#CC0000' }} />
                    <span className="text-white/70 text-sm font-semibold">승부차기(PK)까지 갔어요</span>
                  </label>
                  {form.hasPk && (
                    <div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="match-home-pk" className="block text-white/50 text-xs mb-1.5 font-semibold">홈 PK</label>
                          <input id="match-home-pk" type="number" min="0" inputMode="numeric" value={form.homePk}
                            onChange={(e) => setForm((f) => withPkResult({ ...f, homePk: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white focus:border-red-700 outline-none text-sm text-center" />
                        </div>
                        <div>
                          <label htmlFor="match-away-pk" className="block text-white/50 text-xs mb-1.5 font-semibold">원정 PK</label>
                          <input id="match-away-pk" type="number" min="0" inputMode="numeric" value={form.awayPk}
                            onChange={(e) => setForm((f) => withPkResult({ ...f, awayPk: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0e0e0e] border border-white/10 text-white focus:border-red-700 outline-none text-sm text-center" />
                        </div>
                      </div>
                      <p className="text-white/35 text-[11px] mt-2 leading-relaxed">
                        위 득점에는 승부차기 전 점수를 적어 주세요. PK 점수를 넣으면 결과(승·패)가 자동으로 맞춰지고, 필요하면 위에서 바꿀 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors text-sm">
                  취소
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 font-bold text-white hover:opacity-80 transition-opacity text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#CC0000' }}>
                  {saving ? '저장 중...' : editId !== null ? '수정 완료' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {/* 대회 연결 */}
      {linkMatch !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={e => { if (e.target === e.currentTarget) setLinkMatch(null); }}>
          <div className="w-full max-w-md border border-white/10 p-5 my-auto" style={{ backgroundColor: '#111' }}>
            <h2 className="text-white font-black text-lg">대회 연결</h2>
            <p className="text-white/40 text-xs mt-1 mb-4">
              {linkMatch.date} · <b className="text-white/70">{linkMatch.home} vs {linkMatch.away}</b>
            </p>

            {tournaments.length === 0 ? (
              <p className="text-white/30 text-[13px] border border-white/10 px-3 py-7 text-center">
                등록된 대회가 없습니다. 대회 지도에서 대회를 먼저 등록해 주세요.
              </p>
            ) : (
              <ul className="border border-white/10 max-h-72 overflow-y-auto">
                <li className="border-b border-white/5">
                  <button type="button" disabled={saving}
                    onClick={() => setMatchTournament(linkMatch.id, null)}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors disabled:opacity-40"
                    style={{ backgroundColor: linkMatch.tournamentId ? undefined : 'rgba(204,0,0,0.12)' }}>
                    <span className="text-white/60 text-[13px]">연결 안 함</span>
                  </button>
                </li>
                {tournaments.map(t => {
                  const active = linkMatch.tournamentId === t.id;
                  return (
                    <li key={t.id} className="border-b border-white/5 last:border-0">
                      <button type="button" disabled={saving}
                        onClick={() => setMatchTournament(linkMatch.id, t.id)}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors disabled:opacity-40"
                        style={{ backgroundColor: active ? 'rgba(204,0,0,0.12)' : undefined }}>
                        <span className="block text-white text-[13px]">
                          {t.name}{active && <span style={{ color: '#ff8b84' }}> · 연결됨</span>}
                        </span>
                        <span className="block text-white/35 text-[11px]">{t.from}{t.to && t.to !== t.from ? ` ~ ${t.to}` : ''}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button type="button" onClick={() => setLinkMatch(null)}
              className="w-full mt-4 py-2.5 text-sm font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors">
              닫기
            </button>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#080808' }}>
            <h3 className="text-white font-black text-lg mb-2">경기 삭제</h3>
            <p className="text-white/50 text-sm mb-6">이 경기를 삭제하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors text-sm">
                취소
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={saving}
                className="flex-1 py-2.5 font-bold text-white hover:opacity-80 transition-opacity text-sm disabled:opacity-50"
                style={{ backgroundColor: '#dc2626' }}>
                {saving ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
      {adminModal}
    </div>
  );
}
