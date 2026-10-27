'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { SkeletonRows } from '@/components/Skeleton';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, writeBatch, deleteField
} from 'firebase/firestore';
import {
  MAINLAND, JEJU, HOME, VIEW_W, VIEW_H,
  project, projectPercent, ringToPath, distanceKm,
} from '@/lib/korea';

const STAGES = ['우승', '준우승', '4강', '8강', '16강', '조별'] as const;
type Stage = (typeof STAGES)[number];

type Tournament = {
  id: string;
  name: string;
  city: string;
  venue: string;
  lat: number;
  lng: number;
  from: string;
  to: string;
  stage: Stage;
};

type Match = {
  id: string;
  date: string;
  home: string;
  away: string;
  result: '승' | '무' | '패' | null;
  homeScore: number | null;
  awayScore: number | null;
  tournamentId?: string;
};

type Place = { name: string; address: string; lat: number; lng: number };

const stageColors: Record<Stage, string> = {
  우승: '#e3b341',
  준우승: '#aeb6bf',
  '4강': '#ff3b30',
  '8강': '#CC0000',
  '16강': '#6b7280',
  조별: '#6b7280',
};

const resultColors: Record<string, string> = { 승: '#16a34a', 패: '#dc2626', 무: '#6b7280' };

const emptyForm = {
  name: '',
  city: '',
  venue: '',
  lat: '',
  lng: '',
  from: '',
  to: '',
  stage: '조별' as Stage,
};

function formatRange(from: string, to: string) {
  const a = from.split('-');
  const b = to.split('-');
  if (a.length < 3) return from;
  const start = `${a[0]}.${a[1]}.${a[2]}`;
  if (b.length < 3) return start;
  return `${start}–${a[1] === b[1] ? b[2] : `${b[1]}.${b[2]}`}`;
}

/** TAES 기준 득점·실점으로 정규화한다 (원정 경기면 스코어가 뒤집힌다). */
function goalsFor(m: Match) {
  const isHome = m.home.includes('TAES');
  return {
    gf: (isHome ? m.homeScore : m.awayScore) ?? 0,
    ga: (isHome ? m.awayScore : m.homeScore) ?? 0,
    opponent: isHome ? m.away : m.home,
  };
}

function recordOf(ms: Match[]) {
  return ms.reduce(
    (acc, m) => {
      const { gf, ga } = goalsFor(m);
      acc.gf += gf;
      acc.ga += ga;
      if (m.result === '승') acc.w++;
      else if (m.result === '무') acc.d++;
      else if (m.result === '패') acc.l++;
      return acc;
    },
    { w: 0, d: 0, l: 0, gf: 0, ga: 0 },
  );
}

export default function MapPage() {
  const { requireAdmin, modal: adminModal } = useAdminAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeYear, setActiveYear] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 경기 연결
  const [linkTarget, setLinkTarget] = useState<Tournament | null>(null);
  const [linkPicked, setLinkPicked] = useState<Set<string>>(new Set());
  const [linkShowAll, setLinkShowAll] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tSnap, mSnap] = await Promise.all([
          getDocs(query(collection(db, 'tournaments'), orderBy('from', 'asc'))),
          getDocs(query(collection(db, 'matches'), orderBy('date', 'asc'))),
        ]);
        const loaded = tSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) }));
        setTournaments(loaded);
        setMatches(mSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) })));
        if (loaded.length) setSelectedId(loaded[loaded.length - 1].id);
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const years = useMemo(
    () => [...new Set(tournaments.map(t => t.from.slice(0, 4)))].sort(),
    [tournaments],
  );

  const visible = useMemo(
    () => (activeYear === 'all' ? tournaments : tournaments.filter(t => t.from.slice(0, 4) === activeYear)),
    [tournaments, activeYear],
  );

  const matchesByTournament = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach(m => {
      if (!m.tournamentId) return;
      const list = map.get(m.tournamentId) ?? [];
      list.push(m);
      map.set(m.tournamentId, list);
    });
    return map;
  }, [matches]);

  const stats = useMemo(() => {
    const agg = { w: 0, d: 0, l: 0, games: 0 };
    let km = 0;
    let titles = 0;
    const cities = new Set<string>();
    visible.forEach(t => {
      const rec = recordOf(matchesByTournament.get(t.id) ?? []);
      agg.w += rec.w;
      agg.d += rec.d;
      agg.l += rec.l;
      agg.games += rec.w + rec.d + rec.l;
      km += distanceKm(HOME, t) * 2;
      cities.add(t.city);
      if (t.stage === '우승') titles++;
    });
    return { ...agg, km: Math.round(km), titles, cities: cities.size, count: visible.length };
  }, [visible, matchesByTournament]);

  const selected = visible.find(t => t.id === selectedId) ?? null;
  const selectedMatches = selected ? (matchesByTournament.get(selected.id) ?? []) : [];
  const selectedRecord = recordOf(selectedMatches);

  const maxGames = Math.max(
    1,
    ...visible.map(t => (matchesByTournament.get(t.id) ?? []).length),
  );

  const routePath = useMemo(() => {
    if (!showRoute || visible.length < 2) return '';
    return visible
      .map((t, i) => {
        const [x, y] = project(t.lat, t.lng);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join('');
  }, [visible, showRoute]);

  // ── 관리자 ──
  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setPlaceQuery('');
    setPlaces([]);
    setSearchError('');
    setShowModal(true);
  };

  const openEdit = (t: Tournament) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      city: t.city,
      venue: t.venue,
      lat: String(t.lat),
      lng: String(t.lng),
      from: t.from,
      to: t.to,
      stage: t.stage,
    });
    setPlaceQuery('');
    setPlaces([]);
    setSearchError('');
    setShowModal(true);
  };

  async function searchPlace() {
    const q = placeQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    setPlaces([]);
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? '장소를 검색하지 못했습니다.');
        return;
      }
      if (!data.places.length) setSearchError('검색 결과가 없습니다. 좌표를 직접 입력해 주세요.');
      setPlaces(data.places);
    } catch {
      setSearchError('장소를 검색하지 못했습니다. 좌표를 직접 입력해 주세요.');
    } finally {
      setSearching(false);
    }
  }

  function pickPlace(p: Place) {
    setForm(f => ({
      ...f,
      venue: p.name,
      lat: p.lat.toFixed(6),
      lng: p.lng.toFixed(6),
      city: f.city || p.address.split(' ')[1] || f.city,
    }));
    setPlaces([]);
    setPlaceQuery('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert('위도·경도를 확인해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const data: Omit<Tournament, 'id'> = {
        name: form.name.trim(),
        city: form.city.trim(),
        venue: form.venue.trim(),
        lat,
        lng,
        from: form.from,
        to: form.to || form.from,
        stage: form.stage,
      };
      const id = editId ?? String(Date.now());
      await setDoc(doc(db, 'tournaments', id), data);
      setTournaments(prev => {
        const next = editId
          ? prev.map(t => (t.id === id ? { id, ...data } : t))
          : [...prev, { id, ...data }];
        return next.sort((a, b) => a.from.localeCompare(b.from));
      });
      setSelectedId(id);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save tournament:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'tournaments', id));
      setTournaments(prev => prev.filter(t => t.id !== id));
      setSelectedId(prev => (prev === id ? null : prev));
      setDeleteId(null);
    } catch (err) {
      console.error('Failed to delete tournament:', err);
      alert('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // ── 경기 연결 ──
  /** 대회 기간 ±3일 안의 경기를 후보로 본다 (예선이 하루 일찍 열리는 경우 대비) */
  function inRange(m: Match, t: Tournament) {
    const shift = (iso: string, days: number) => {
      const d = new Date(`${iso}T00:00:00`);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    return m.date >= shift(t.from, -3) && m.date <= shift(t.to || t.from, 3);
  }

  function openLink(t: Tournament) {
    setLinkTarget(t);
    setLinkPicked(new Set(matches.filter(m => m.tournamentId === t.id).map(m => m.id)));
    setLinkShowAll(false);
  }

  function togglePick(id: string) {
    setLinkPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSaveLinks() {
    if (!linkTarget) return;
    const t = linkTarget;
    const before = new Set(matches.filter(m => m.tournamentId === t.id).map(m => m.id));
    const toLink = [...linkPicked].filter(id => !before.has(id));
    const toUnlink = [...before].filter(id => !linkPicked.has(id));
    if (!toLink.length && !toUnlink.length) { setLinkTarget(null); return; }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      toLink.forEach(id => batch.update(doc(db, 'matches', id), { tournamentId: t.id }));
      toUnlink.forEach(id => batch.update(doc(db, 'matches', id), { tournamentId: deleteField() }));
      await batch.commit();

      setMatches(prev => prev.map(m => {
        if (toLink.includes(m.id)) return { ...m, tournamentId: t.id };
        if (toUnlink.includes(m.id)) return { ...m, tournamentId: undefined };
        return m;
      }));
      setLinkTarget(null);
    } catch (err) {
      console.error('Failed to link matches:', err);
      alert('경기 연결에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full px-3 py-2.5 text-white text-sm border border-white/10 outline-none focus:border-white/30 transition-colors';
  const inputStyle = { backgroundColor: '#1a1a1a' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080808' }}>
      {adminModal}

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-white font-black text-3xl sm:text-4xl">대회 지도</h1>
            <div className="section-divider" />
            <p className="text-white/40 text-sm mt-3">
              지금까지 참가한 대회와 전적을 지도에 기록합니다.
            </p>
          </div>
          <button
            onClick={() => requireAdmin(openAdd)}
            className="px-4 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity touch-manipulation"
            style={{ backgroundColor: '#CC0000' }}
          >
            + 대회 등록
          </button>
        </div>

        {loading ? (
          <SkeletonRows count={4} />
        ) : !tournaments.length ? (
          <div className="border border-white/10 px-6 py-16 text-center" style={{ backgroundColor: '#0f1012' }}>
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-white font-bold mb-2">아직 등록된 대회가 없습니다</p>
            <p className="text-white/40 text-sm mb-6">
              대회를 등록하면 지도에 표시되고, 전적과 원정 거리가 자동으로 계산됩니다.
            </p>
            <button
              onClick={() => requireAdmin(openAdd)}
              className="px-5 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#CC0000' }}
            >
              첫 대회 등록하기
            </button>
          </div>
        ) : (
          <>
            {/* 집계 */}
            <div className="grid gap-px border border-white/10 mb-5"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', backgroundColor: 'rgba(255,255,255,0.1)' }}>
              {[
                ['참가 대회', `${stats.count}`, '개'],
                ['방문 도시', `${stats.cities}`, '곳'],
                ['치른 경기', `${stats.games}`, '경기'],
                ['우승', `${stats.titles}`, '회'],
                ['원정 거리', stats.km.toLocaleString('ko-KR'), 'km'],
              ].map(([label, value, unit]) => (
                <div key={label} className="px-4 py-3.5" style={{ backgroundColor: '#0f1012' }}>
                  <div className="text-white/40 text-[11px] mb-1">{label}</div>
                  <div className="text-white font-black text-2xl leading-none">
                    {value}
                    <span className="text-white/40 text-sm font-medium ml-0.5">{unit}</span>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3.5" style={{ backgroundColor: '#0f1012' }}>
                <div className="text-white/40 text-[11px] mb-1">종합 전적</div>
                <div className="font-black text-2xl leading-none">
                  <span style={{ color: resultColors['승'] }}>{stats.w}</span>
                  <span className="text-white/20 mx-0.5">·</span>
                  <span style={{ color: resultColors['무'] }}>{stats.d}</span>
                  <span className="text-white/20 mx-0.5">·</span>
                  <span style={{ color: resultColors['패'] }}>{stats.l}</span>
                </div>
              </div>
            </div>

            {/* 필터 */}
            <div className="flex flex-wrap gap-2 items-center mb-4">
              {['all', ...years].map(y => (
                <button
                  key={y}
                  onClick={() => setActiveYear(y)}
                  className="px-4 py-1.5 text-[13px] rounded-full border transition-colors touch-manipulation"
                  style={
                    activeYear === y
                      ? { backgroundColor: '#CC0000', borderColor: '#CC0000', color: '#fff', fontWeight: 700 }
                      : { borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }
                  }
                >
                  {y === 'all' ? '전체' : `${y}년`}
                </button>
              ))}
              <button
                onClick={() => setShowRoute(v => !v)}
                className="px-4 py-1.5 text-[13px] rounded-full border transition-colors ml-auto touch-manipulation"
                style={
                  showRoute
                    ? { backgroundColor: 'rgba(204,0,0,0.14)', borderColor: '#CC0000', color: '#ff8b84', fontWeight: 700 }
                    : { borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }
                }
              >
                원정 경로
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)] items-start">
              {/* 지도 */}
              <section className="border border-white/10" style={{ backgroundColor: '#0f1012' }}>
                <div
                  className="relative mx-auto w-full"
                  style={{ maxWidth: 400, aspectRatio: `${VIEW_W} / ${VIEW_H}`, backgroundColor: '#080a0d' }}
                >
                  <svg
                    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="absolute inset-0 w-full h-full"
                    aria-hidden="true"
                  >
                    {[MAINLAND, JEJU].map((ring, i) => (
                      <path key={i} d={ringToPath(ring)} fill="#1b1e23" stroke="rgba(204,0,0,.45)" strokeWidth="1.1" />
                    ))}
                    {routePath && (
                      <path d={routePath} fill="none" stroke="rgba(204,0,0,.5)" strokeWidth="1.6"
                        strokeDasharray="5 5" strokeLinejoin="round" strokeLinecap="round" />
                    )}
                  </svg>

                  <div className="absolute inset-0">
                    {/* 홈 */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center"
                      style={{ ...projectPercent(HOME.lat, HOME.lng), zIndex: 1 }}>
                      <span className="rounded-full bg-white"
                        style={{ width: 11, height: 11, border: '2px solid #050505', boxShadow: '0 0 0 1px rgba(255,255,255,.14)' }} />
                      <span className="absolute rounded-full border border-dashed border-white/35" style={{ width: 28, height: 28 }} />
                      <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-white"
                        style={{ bottom: 'calc(100% + 6px)', textShadow: '0 1px 3px #050505, 0 0 6px #050505' }}>
                        홈 · {HOME.city}
                      </span>
                    </div>

                    {visible.map((t, i) => {
                      const games = (matchesByTournament.get(t.id) ?? []).length;
                      const size = 15 + Math.round((games / maxGames) * 13);
                      const isSel = t.id === selectedId;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedId(t.id)}
                          aria-pressed={isSel}
                          aria-label={`${t.name}, ${t.city}, ${t.stage}`}
                          className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center"
                          style={{ ...projectPercent(t.lat, t.lng), width: size, height: size, zIndex: 2 }}
                        >
                          <span
                            className="rounded-full transition-transform"
                            style={{
                              width: size,
                              height: size,
                              backgroundColor: stageColors[t.stage] ?? '#6b7280',
                              border: '2px solid rgba(5,5,5,.85)',
                              boxShadow: isSel
                                ? '0 0 0 3px rgba(255,59,48,.3), 0 0 18px rgba(255,59,48,.55)'
                                : '0 0 0 1px rgba(255,255,255,.14), 0 2px 8px rgba(0,0,0,.6)',
                              transform: isSel ? 'scale(1.3)' : undefined,
                            }}
                          />
                          <span className="absolute text-[10px] font-bold text-white pointer-events-none"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,.9)' }}>
                            {i + 1}
                          </span>
                          <span
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] pointer-events-none"
                            style={{
                              top: 'calc(100% + 3px)',
                              color: isSel ? '#fff' : 'rgba(255,255,255,.62)',
                              fontWeight: isSel ? 700 : 400,
                              textShadow: '0 1px 3px #050505, 0 0 6px #050505',
                            }}
                          >
                            {t.city}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 px-3.5 py-3 border-t border-white/10 text-[11px] text-white/40">
                  {STAGES.filter(s => s !== '조별').map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <i className="rounded-full" style={{ width: 9, height: 9, backgroundColor: stageColors[s] }} />
                      {s}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5">
                    <i className="rounded-full bg-white" style={{ width: 9, height: 9 }} />홈
                  </span>
                  <span>원 크기 = 경기 수</span>
                </div>
              </section>

              {/* 상세 + 타임라인 */}
              <aside className="border border-white/10" style={{ backgroundColor: '#0f1012' }}>
                {selected ? (
                  <>
                    <div className="p-4 sm:p-5 border-b border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-white font-black text-lg sm:text-xl leading-snug">{selected.name}</h2>
                          <p className="text-white/40 text-[12.5px] mt-1.5">
                            <span className="text-white/70">{selected.city}</span>
                            {selected.venue && ` · ${selected.venue}`}
                            <br />
                            {formatRange(selected.from, selected.to)} · {HOME.city}에서{' '}
                            {Math.round(distanceKm(HOME, selected)).toLocaleString('ko-KR')}km
                          </p>
                        </div>
                        <span
                          className="flex-none font-black text-[15px] px-2.5 py-1.5 border"
                          style={{ color: stageColors[selected.stage], borderColor: stageColors[selected.stage] }}
                        >
                          {selected.stage}
                        </span>
                      </div>

                      {selectedMatches.length > 0 && (
                        <>
                          <div className="flex h-1.5 mt-4 overflow-hidden" style={{ backgroundColor: '#000' }}>
                            {(['승', '무', '패'] as const).map(k => {
                              const n = k === '승' ? selectedRecord.w : k === '무' ? selectedRecord.d : selectedRecord.l;
                              return n ? <i key={k} style={{ flex: n, backgroundColor: resultColors[k] }} /> : null;
                            })}
                          </div>
                          <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2 text-xs text-white/40">
                            <span>
                              <b className="font-black text-base" style={{ color: resultColors['승'] }}>{selectedRecord.w}</b>승{' '}
                              <b className="font-black text-base" style={{ color: resultColors['무'] }}>{selectedRecord.d}</b>무{' '}
                              <b className="font-black text-base" style={{ color: resultColors['패'] }}>{selectedRecord.l}</b>패
                            </span>
                            <span>
                              득점 <b className="text-white/70">{selectedRecord.gf}</b> · 실점{' '}
                              <b className="text-white/70">{selectedRecord.ga}</b> · 득실{' '}
                              <b className="text-white/70">
                                {selectedRecord.gf - selectedRecord.ga > 0 ? '+' : ''}
                                {selectedRecord.gf - selectedRecord.ga}
                              </b>
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => requireAdmin(() => openLink(selected))}
                          className="px-3 py-1.5 text-xs font-bold text-white border transition-colors"
                          style={{ borderColor: 'rgba(204,0,0,0.6)', color: '#ff8b84' }}
                        >
                          ⚽ 경기 연결
                        </button>
                        <button
                          onClick={() => requireAdmin(() => openEdit(selected), { reconfirm: true })}
                          className="px-3 py-1.5 text-xs font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => requireAdmin(() => setDeleteId(selected.id), { reconfirm: true })}
                          className="px-3 py-1.5 text-xs font-bold border border-white/20 hover:border-red-500 transition-colors"
                          style={{ color: '#dc2626' }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <h3 className="text-white/40 text-[11px] tracking-widest font-bold mb-3">경기 결과</h3>
                      {selectedMatches.length ? (
                        <table className="w-full text-[13px]">
                          <tbody>
                            {selectedMatches.map(m => {
                              const { gf, ga, opponent } = goalsFor(m);
                              return (
                                <tr key={m.id} className="border-b border-white/5 last:border-0">
                                  <td className="py-2.5 text-white/40 whitespace-nowrap w-[52px]">
                                    {m.date.slice(5).replace('-', '.')}
                                  </td>
                                  <td className="py-2.5 text-white/85">{opponent}</td>
                                  <td className="py-2.5 text-right font-black text-base text-white whitespace-nowrap w-[52px]">
                                    {gf}:{ga}
                                  </td>
                                  <td className="py-2.5 text-right w-[26px]">
                                    {m.result && (
                                      <span className="inline-grid place-items-center text-[11px] font-bold text-white"
                                        style={{ width: 20, height: 20, backgroundColor: resultColors[m.result] }}>
                                        {m.result}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-[13px]">
                          <p className="text-white/30 mb-3">
                            이 대회에 연결된 경기가 없습니다. 경기 일정에 등록된 경기를 골라 연결하면
                            전적과 득실이 자동으로 계산됩니다.
                          </p>
                          <button
                            onClick={() => requireAdmin(() => openLink(selected))}
                            className="px-3 py-2 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: '#CC0000' }}
                          >
                            ⚽ 경기 연결하기
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-white/40 text-sm">
                    {activeYear === 'all' ? '대회를 선택해 주세요.' : '해당 연도에 기록된 대회가 없습니다.'}
                  </div>
                )}

                <div className="p-4 sm:p-5 border-t border-white/10">
                  <h3 className="text-white/40 text-[11px] tracking-widest font-bold mb-3">
                    전체 대회 <span className="text-white/20">({visible.length})</span>
                  </h3>
                  <ol className="grid gap-px max-h-[320px] overflow-y-auto">
                    {[...visible].reverse().map(t => {
                      const rec = recordOf(matchesByTournament.get(t.id) ?? []);
                      const isSel = t.id === selectedId;
                      return (
                        <li key={t.id}>
                          <button
                            onClick={() => setSelectedId(t.id)}
                            aria-pressed={isSel}
                            className="w-full text-left px-3 py-2.5 grid grid-cols-[1fr_auto] gap-x-3 items-center transition-colors"
                            style={{
                              backgroundColor: isSel ? '#23191a' : '#161719',
                              borderLeft: `3px solid ${isSel ? '#CC0000' : 'transparent'}`,
                            }}
                          >
                            <span className="text-[13.5px] text-white/90 break-words min-w-0">{t.name}</span>
                            <span className="row-span-2 text-right">
                              <span className="block text-xs font-bold" style={{ color: stageColors[t.stage] }}>
                                {t.stage}
                              </span>
                              <span className="block text-xs text-white/40">
                                {rec.w}-{rec.d}-{rec.l}
                              </span>
                            </span>
                            <span className="col-start-1 text-[11.5px] text-white/40">
                              {formatRange(t.from, t.to)} · {t.city}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* 대회 등록·수정 */}
      {showModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <form onSubmit={handleSubmit} className="w-full max-w-md border border-white/10 p-5 my-auto"
            style={{ backgroundColor: '#111' }}>
            <h2 className="text-white font-black text-lg mb-4">{editId ? '대회 수정' : '대회 등록'}</h2>

            <label className="block text-white/40 text-xs mb-1.5">대회명</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="화랑대기 전국유소년축구대회" className={`${inputClass} mb-3`} style={inputStyle} />

            <label className="block text-white/40 text-xs mb-1.5">경기장 검색</label>
            <div className="flex gap-2 mb-2">
              <input value={placeQuery} onChange={e => setPlaceQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(); } }}
                placeholder="경주시민운동장" className={inputClass} style={inputStyle} />
              <button type="button" onClick={searchPlace} disabled={searching}
                className="flex-none px-4 text-sm font-bold text-white border border-white/20 hover:border-white/40 transition-colors disabled:opacity-40">
                {searching ? '…' : '검색'}
              </button>
            </div>
            {searchError && <p className="text-amber-400/80 text-xs mb-2">{searchError}</p>}
            {places.length > 0 && (
              <ul className="mb-3 border border-white/10 max-h-44 overflow-y-auto">
                {places.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    <button type="button" onClick={() => pickPlace(p)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors">
                      <span className="block text-white text-[13px]">{p.name}</span>
                      <span className="block text-white/35 text-[11px]">{p.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-white/40 text-xs mb-1.5">도시</label>
                <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="경주" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1.5">경기장</label>
                <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  placeholder="경주시민운동장" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1.5">위도 (lat)</label>
                <input required inputMode="decimal" value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                  placeholder="35.8562" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1.5">경도 (lng)</label>
                <input required inputMode="decimal" value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                  placeholder="129.2247" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1.5">시작일</label>
                <input required type="date" value={form.from}
                  onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                  className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1.5">종료일</label>
                <input type="date" value={form.to}
                  onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                  className={inputClass} style={inputStyle} />
              </div>
            </div>

            <label className="block text-white/40 text-xs mb-1.5">최종 성적</label>
            <div className="flex flex-wrap gap-2 mb-5">
              {STAGES.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, stage: s }))}
                  className="px-3 py-1.5 text-xs font-bold border transition-colors"
                  style={
                    form.stage === s
                      ? { backgroundColor: stageColors[s], borderColor: stageColors[s], color: '#111' }
                      : { borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }
                  }>
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors">
                취소
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#CC0000' }}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 경기 연결 */}
      {linkTarget && (() => {
        const t = linkTarget;
        const candidates = matches
          .filter(m => linkShowAll || inRange(m, t) || m.tournamentId === t.id)
          .sort((a, b) => a.date.localeCompare(b.date));
        const nameOf = (id?: string) => tournaments.find(x => x.id === id)?.name ?? '다른 대회';
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
            onClick={e => { if (e.target === e.currentTarget) setLinkTarget(null); }}>
            <div className="w-full max-w-lg border border-white/10 p-5 my-auto" style={{ backgroundColor: '#111' }}>
              <h2 className="text-white font-black text-lg">경기 연결</h2>
              <p className="text-white/40 text-xs mt-1 mb-4">
                <b className="text-white/70">{t.name}</b> · {formatRange(t.from, t.to)}
              </p>

              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-white/40 text-xs">
                  {linkShowAll ? '전체 경기' : '대회 기간 전후'} {candidates.length}건 · 선택 {linkPicked.size}건
                </span>
                <button type="button" onClick={() => setLinkShowAll(v => !v)}
                  className="flex-none text-xs text-white/50 underline hover:text-white transition-colors">
                  {linkShowAll ? '기간 내만 보기' : '전체 경기 보기'}
                </button>
              </div>

              {candidates.length ? (
                <ul className="border border-white/10 max-h-80 overflow-y-auto">
                  {candidates.map(m => {
                    const { gf, ga, opponent } = goalsFor(m);
                    const other = m.tournamentId && m.tournamentId !== t.id;
                    return (
                      <li key={m.id} className="border-b border-white/5 last:border-0">
                        <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors">
                          <input type="checkbox" checked={linkPicked.has(m.id)}
                            onChange={() => togglePick(m.id)}
                            className="flex-none w-4 h-4 accent-[#CC0000]" />
                          <span className="flex-none text-white/40 text-xs w-[62px]">
                            {m.date.slice(2).replace(/-/g, '.')}
                          </span>
                          <span className="min-w-0 flex-1 text-white/85 text-[13px]">
                            {opponent}
                            {other && (
                              <span className="block text-[11px]" style={{ color: '#e3b341' }}>
                                {nameOf(m.tournamentId)}에 연결됨
                              </span>
                            )}
                          </span>
                          <span className="flex-none text-white font-black text-sm">{gf}:{ga}</span>
                          {m.result && (
                            <span className="flex-none inline-grid place-items-center text-[11px] font-bold text-white"
                              style={{ width: 20, height: 20, backgroundColor: resultColors[m.result] }}>
                              {m.result}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-white/30 text-[13px] border border-white/10 px-3 py-7 text-center">
                  {linkShowAll
                    ? '경기 일정에 등록된 경기가 없습니다. 먼저 경기를 등록해 주세요.'
                    : '대회 기간에 해당하는 경기가 없습니다. 전체 경기 보기를 눌러보세요.'}
                </p>
              )}

              <p className="text-white/25 text-[11px] mt-2">
                체크를 해제하면 연결만 끊어지고 경기 기록은 그대로 남습니다.
              </p>

              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setLinkTarget(null)}
                  className="flex-1 py-2.5 text-sm font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors">
                  취소
                </button>
                <button type="button" onClick={handleSaveLinks} disabled={saving}
                  className="flex-1 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: '#CC0000' }}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 삭제 확인 */}
      {deleteId && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="w-full max-w-sm border border-white/10 p-6" style={{ backgroundColor: '#111' }}>
            <h2 className="text-white font-black text-lg mb-2">대회를 삭제할까요?</h2>
            <p className="text-white/40 text-sm mb-5">
              지도에서 사라집니다. 연결된 경기 기록은 그대로 남습니다.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-bold text-white/50 border border-white/20 hover:border-white/40 transition-colors">
                취소
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={saving}
                className="flex-1 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#dc2626' }}>
                {saving ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
