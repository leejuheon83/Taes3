'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/components/AdminAuth';
import { SkeletonRows } from '@/components/Skeleton';
import ClubIcon, { type ClubIconName } from '@/components/ClubIcon';
import TournamentSatelliteMap from '@/components/TournamentSatelliteMap';
import './map-dashboard.css';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, writeBatch, deleteField
} from 'firebase/firestore';
import { HOME, distanceKm } from '@/lib/korea';

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
  if (from === to) return start;
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
  // 선택과 별개로, 목록에서 세부 경기표를 펼쳐 둘지 여부
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [sortOrder, setSortOrder] = useState('latest');

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
        if (loaded.length) {
          const latest = loaded[loaded.length - 1].id;
          setSelectedId(latest);
          setExpandedId(null);
        }
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
      setExpandedId(id);
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
      setExpandedId(prev => (prev === id ? null : prev));
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
    <div className="satellite-page min-h-screen">
      {adminModal}

      <div className="satellite-shell mx-auto px-4 py-10">
        <div className="satellite-heading flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <div className="map-page-eyebrow">TOURNAMENT ARCHIVE</div>
            <h1>대회 지도</h1>
            <p className="map-page-intro">함께 뛴 도시와 쌓아온 기록.</p>
          </div>
          <button
            onClick={() => requireAdmin(openAdd)}
            className="px-4 py-2.5 text-sm font-bold text-white hover:opacity-80 transition-opacity touch-manipulation"
            style={{ backgroundColor: '#CC0000' }}
          >
            <ClubIcon name="plus" /> 대회 등록
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
            <div className="satellite-stats">
              {[
                ['참가 대회', `${stats.count}`, '개'],
                ['방문 도시', `${stats.cities}`, '곳'],
                ['치른 경기', `${stats.games}`, '경기'],
                ['우승', `${stats.titles}`, '회'],
                ['원정 거리', stats.km.toLocaleString('ko-KR'), 'km'],
              ].map(([label, value, unit]) => (
                <div key={label} className="stat-tile">
                  <ClubIcon name={({ '참가 대회':'cup', '방문 도시':'pin', '치른 경기':'ball', '우승':'crown', '원정 거리':'road' } as Record<string, ClubIconName>)[label]} />
                  <div>
                  <div className="text-white/40 text-[11px] mb-1">{label}</div>
                  <div className="text-white font-black text-2xl leading-none">
                    {value}
                    <span className="text-white/40 text-sm font-medium ml-0.5">{unit}</span>
                  </div>
                  </div>
                </div>
              ))}
              <div className="stat-tile">
                <ClubIcon name="chart" /><div>
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
            </div>

            {/* 필터 */}
            <div className="satellite-filters flex flex-wrap gap-2 items-center mb-4">
              {['all', ...years].map(y => (
                <button
                  key={y}
                  aria-pressed={activeYear === y}
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
                aria-pressed={showRoute}
                className="px-4 py-1.5 text-[13px] rounded-full border transition-colors ml-auto touch-manipulation"
                style={
                  showRoute
                    ? { backgroundColor: 'rgba(204,0,0,0.14)', borderColor: '#CC0000', color: '#ff8b84', fontWeight: 700 }
                    : { borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }
                }
              >
                <ClubIcon name="route" /> 원정 경로 보기
              </button>
            </div>

            <div className="map-reference-layout grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)] items-start">
              {/* 지도 */}
              <section className="satellite-map-panel" aria-label="대회 개최 도시">
                <TournamentSatelliteMap points={visible} selectedId={selectedId} showRoute={showRoute}
                  onSelect={id => { setSelectedId(id); setExpandedId(null); }} />
              </section>
              {/* 상세 + 타임라인 */}
              <aside className="satellite-details">
                {selected ? (
                  <>
                    <section className="tournament-spotlight" style={{'--achievement':stageColors[selected.stage]} as React.CSSProperties} aria-label="선택한 대회">
                      <div className="spotlight-hero">
                        <div className="spotlight-topline"><span>{selected.from.slice(0,4)} SEASON</span><span>대회 기록</span></div>
                        <div className="spotlight-award"><ClubIcon name={selected.stage==='우승'?'cup':selected.stage==='준우승'?'medal':'shield'} /><strong>{selected.stage}</strong></div>
                        <div className="spotlight-location"><ClubIcon name="pin" />{selected.city}</div>
                        <h2>{selected.name}</h2>
                        <div className="spotlight-date"><ClubIcon name="calendar" />{formatRange(selected.from,selected.to)}</div>
                      </div>
                      <div className="spotlight-body">
                        <div className="spotlight-venue"><ClubIcon name="pin" /><span>{selected.venue || '경기장 미등록'}</span><span className="spotlight-distance">{HOME.city}에서 {Math.round(distanceKm(HOME,selected))} km</span></div>
                        {selectedMatches.length ? <>
                          <div className="spotlight-scoreboard" aria-label="대회 전적">
                            <div className="record-win"><strong>{selectedRecord.w}</strong><span>승리</span></div>
                            <div><strong>{selectedRecord.d}</strong><span>무승부</span></div>
                            <div className="record-loss"><strong>{selectedRecord.l}</strong><span>패배</span></div>
                          </div>
                          <div className="spotlight-goals"><span>득점 <b>{selectedRecord.gf}</b></span><span>실점 <b>{selectedRecord.ga}</b></span><span>득실 <b>{selectedRecord.gf-selectedRecord.ga>0?'+':''}{selectedRecord.gf-selectedRecord.ga}</b></span></div>
                        </> : <p className="spotlight-empty">경기를 연결하면 전적이 표시됩니다.</p>}
                        <div className="spotlight-actions">
                          <button onClick={()=>requireAdmin(()=>openLink(selected))}><ClubIcon name="ball"/>경기 연결</button>
                          <button onClick={()=>requireAdmin(()=>openEdit(selected),{reconfirm:true})}><ClubIcon name="edit"/>수정</button>
                          <button onClick={()=>requireAdmin(()=>setDeleteId(selected.id),{reconfirm:true})}><ClubIcon name="trash"/>삭제</button>
                        </div>
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="p-8 text-center text-white/40 text-sm">
                    {activeYear === 'all' ? '대회를 선택해 주세요.' : '해당 연도에 기록된 대회가 없습니다.'}
                  </div>
                )}

                <div className="satellite-history">
                  <div className="history-heading">
                  <h3 className="text-white/40 text-[11px] tracking-widest font-bold mb-3">
                    전체 대회 <span className="text-white/20">({visible.length})</span>
                  </h3>
                  <select aria-label="대회 정렬" value={sortOrder} onChange={e => setSortOrder(e.target.value)}><option value="latest">최신순</option><option value="oldest">오래된순</option></select>
                  </div>
                  <ol className="grid gap-px">
                    {[...visible].sort((a,b) => sortOrder === 'latest' ? b.from.localeCompare(a.from) : a.from.localeCompare(b.from)).map((t,index) => {
                      const games = matchesByTournament.get(t.id) ?? [];
                      const rec = recordOf(games);
                      const isSel = t.id === selectedId;
                      const isOpen = t.id === expandedId;
                      return (
                        <li key={t.id} className={isSel ? 'selected-tournament' : ''} style={{ '--stage-color':stageColors[t.stage] } as React.CSSProperties}>
                          <button
                            onClick={e => {
                              const el = e.currentTarget;
                              setSelectedId(t.id);
                              // 같은 대회를 다시 누르면 세부 경기표를 접는다
                              setExpandedId(prev => (prev === t.id ? null : t.id));
                              // 펼쳐진 내용이 목록 스크롤 밖으로 밀려나지 않게 한다
                              requestAnimationFrame(() =>
                                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
                            }}
                            aria-expanded={isOpen}
                            aria-pressed={isSel}
                            className="w-full text-left px-3 py-2.5 grid grid-cols-[1fr_auto] gap-x-3 items-center transition-colors"
                            style={{
                              backgroundColor: isSel ? 'rgba(255,255,255,.045)' : 'transparent',
                              borderLeft: `2px solid ${isSel ? stageColors[t.stage] : 'transparent'}`,
                            }}
                          >
                            <span className="map-entry-title text-white/90 min-w-0">
                              <b className="map-entry-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</b>
                              <span className="map-entry-name">{t.name}</span>
                            </span>
                            <span className="row-span-2 text-right">
                              <span className="block text-xs font-bold" style={{ color: stageColors[t.stage] }}>
                                {t.stage}
                              </span>
                              <span className="block text-xs text-white/40">
                                {rec.w}-{rec.d}-{rec.l}
                              </span>
                            </span>
                            <span className="map-entry-meta col-start-1 text-white/40">
                              <span>{t.city}</span><span>{formatRange(t.from, t.to)}</span>
                            </span>
                          </button>

                          {isOpen && (
                            <div className="px-3 pt-1 pb-3"
                              style={{ backgroundColor: 'rgba(255,255,255,.015)', borderLeft: `2px solid ${stageColors[t.stage]}` }}>
                              {games.length ? (
                                <table className="w-full text-[13px]">
                                  <tbody>
                                    {games.map(m => {
                                      const { gf, ga, opponent } = goalsFor(m);
                                      return (
                                        <tr key={m.id} className="border-b border-white/5 last:border-0">
                                          <td className="py-2 text-white/40 whitespace-nowrap w-[46px]">
                                            {m.date.slice(5).replace('-', '.')}
                                          </td>
                                          <td className="py-2 text-white/85">{opponent}</td>
                                          <td className="py-2 text-right font-black text-base text-white whitespace-nowrap w-[48px]">
                                            {gf}:{ga}
                                          </td>
                                          <td className="py-2 text-right w-[26px]">
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
                                <div className="text-[13px] py-1">
                                  <p className="text-white/30 mb-2.5">
                                    연결된 경기가 없습니다. 경기를 연결하면 전적과 득실이 자동으로 계산됩니다.
                                  </p>
                                  <button
                                    onClick={() => requireAdmin(() => openLink(t))}
                                    className="px-3 py-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: '#CC0000' }}
                                  >
                                    ⚽ 경기 연결하기
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
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
