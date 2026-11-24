'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { HOME } from '@/lib/korea';

type Point = { id: string; name: string; city: string; lat: number; lng: number; stage: string };
const colors: Record<string, string> = { '우승': '#f7bf37', '준우승': '#aeb6bf', '4강': '#ee3439', '8강': '#f87918', '16강': '#009fe9', '조별': '#d1d5db' };
const trophyPath = 'M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 5 4M17 5h4v3a4 4 0 0 1-5 4M12 14v6M8 21h8';
const medalPath = 'm7 2 5 7 5-7M5 2h4M15 2h4M18 15a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z';
const shieldPath = 'M4 3h16v8c0 6-8 11-8 11S4 17 4 11V3Z';
function stageSymbol(stage: string) {
  const path = stage === '우승' ? trophyPath : stage === '준우승' ? medalPath : shieldPath;
  const number = ({ '4강':'4', '8강':'8', '16강':'16', '조별':'·' } as Record<string,string>)[stage] ?? '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/>${number ? `<text x="12" y="14" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" font-weight="700">${number}</text>` : ''}</svg>`;
}
const cities: [string, number, number][] = [['서울',37.5665,126.978],['인천',37.456,126.705],['강릉',37.752,128.876],['대전',36.35,127.385],['대구',35.872,128.601],['울산',35.539,129.311],['광주',35.16,126.852],['부산',35.18,129.076],['제주',33.499,126.531]];

export default function TournamentSatelliteMap({ points, selectedId, showRoute, onSelect }: {
  points: Point[]; selectedId: string | null; showRoute: boolean; onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Leaflet.Map | null>(null);
  const api = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const fitted = useRef(false);

  const focusTournaments = () => {
    const map = instance.current; const L = api.current;
    if (!map || !L || !points.length) return;
    map.fitBounds(L.latLngBounds(points.map(p => L.latLng(p.lat,p.lng))),{padding:[65,90],maxZoom:10});
  };

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    import('leaflet').then(L => {
      if (cancelled || !container.current) return;
      api.current = L;
      const map = L.map(container.current, { zoomControl: true, scrollWheelZoom: false, minZoom: 5, maxZoom: 17, zoomSnap: .25 });
      instance.current = map;
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri, Vantor, Earthstar Geographics, GIS User Community', maxZoom: 19,
      }).on('tileerror', () => setFailed(true)).on('tileload', () => setFailed(false)).addTo(map);
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Roads © Esri, HERE, Garmin, OpenStreetMap contributors', opacity: .6, maxZoom: 19,
      }).addTo(map);
      const reset = () => map.fitBounds([[33.15,125.7],[38.45,129.7]], { padding: [14,14], animate: false });
      reset();
      observer = new ResizeObserver(() => { map.invalidateSize(); });
      observer.observe(container.current);
      cities.forEach(([name,lat,lng]) => {
        const label = document.createElement('span'); label.textContent = name;
        L.circleMarker([lat,lng],{radius:3,color:'#b1b9c2',weight:1,fillOpacity:1}).addTo(map)
          .bindTooltip(label,{permanent:true,direction:'right',className:'satellite-city',offset:[5,0]});
      });
      setReady(true);
    }).catch(() => setFailed(true));
    return () => { cancelled = true; observer?.disconnect(); instance.current?.remove(); instance.current = null; };
  }, []);

  useEffect(() => {
    const map = instance.current; const L = api.current;
    if (!ready || !map || !L) return;
    const layer = L.layerGroup().addTo(map);
    if (!fitted.current && points.length) {
      map.fitBounds(L.latLngBounds(points.map(p=>L.latLng(p.lat,p.lng))),{padding:[65,90],maxZoom:10,animate:false});
      fitted.current=true;
    }
    const draw = () => {
      layer.clearLayers();
      L.circleMarker([HOME.lat,HOME.lng], {radius:4,color:'#fff',weight:1,fillOpacity:1}).addTo(layer);
      if (showRoute && points.length > 1) L.polyline(points.map(p => [p.lat,p.lng]),{color:'#d5e1ee',weight:1.5,dashArray:'5 5',opacity:.7}).addTo(layer);
      const occupied: {x:number;y:number}[] = [];
      [...points].sort((a,b) => a.id.localeCompare(b.id)).forEach(p => {
        const original = map.latLngToLayerPoint([p.lat,p.lng]);
        let position = original;
        // Only a small local nudge for overlapping symbols; never combine regions.
        search: for (const radius of [0,34,52,68]) {
          for (let i=0;i<8;i++) {
            const candidate = L.point(original.x+Math.cos(i*Math.PI/4)*radius,original.y+Math.sin(i*Math.PI/4)*radius);
            if (occupied.every(other => Math.abs(candidate.x-other.x)>=36 || Math.abs(candidate.y-other.y)>=46)) { position=candidate; break search; }
          }
        }
        occupied.push(position);
        const color = colors[p.stage] ?? '#d1d5db';
        if (position.distanceTo(original)>1) {
          L.polyline([[p.lat,p.lng],map.layerPointToLatLng(position)],{color,weight:1,opacity:.6,interactive:false}).addTo(layer);
          L.circleMarker([p.lat,p.lng],{radius:2,color,weight:1,fillOpacity:1,interactive:false}).addTo(layer);
        }
        const el = document.createElement('button'); el.type='button';
        el.className=`satellite-map-icon ${p.stage==='우승'?'is-champion':''} ${p.id===selectedId?'is-active':''}`;
        el.style.setProperty('--pin-color',color); el.innerHTML=stageSymbol(p.stage);
        el.setAttribute('aria-label',`${p.city}, ${p.name}, ${p.stage}`); el.setAttribute('aria-pressed',String(p.id===selectedId));
        const marker=L.marker(map.layerPointToLatLng(position),{keyboard:false,icon:L.divIcon({html:el,className:'satellite-marker',iconSize:[36,44],iconAnchor:[18,38]}),zIndexOffset:p.id===selectedId?1000:100}).addTo(layer);
        marker.on('click',()=>onSelect(p.id));
        const label=document.createElement('span');label.textContent=p.id===selectedId?p.city:`${p.city} · ${p.stage} · ${p.name}`;
        marker.bindTooltip(label,{permanent:p.id===selectedId,direction:'bottom',offset:[0,3],className:p.id===selectedId?'satellite-city selected-city':'satellite-tip'});
      });
    };
    draw();
    map.on('zoomend resize', draw);
    return () => { map.off('zoomend resize', draw); layer.remove(); };
  }, [ready, points, selectedId, showRoute, onSelect]);

  return <div className="satellite-wrap">
    <div ref={container} className="satellite-canvas" aria-label="대한민국 대회 위성 지도" />
    <div className="map-view-controls" role="group" aria-label="지도 표시 범위">
      <button type="button" onClick={focusTournaments}>대회 지역</button>
      <button type="button" onClick={()=>instance.current?.fitBounds([[33.15,125.7],[38.45,129.7]],{padding:[14,14]})}>전국</button>
    </div>
    <button type="button" className="satellite-reset" aria-label="대회 지역 맞춰 보기" onClick={focusTournaments}>⌖</button>

    {failed && <div className="satellite-error" role="status">지도 영상을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</div>}
    <div className="satellite-legend">{Object.entries(colors).filter(([s])=>s!=='조별').map(([s,c])=><span key={s}><span className="legend-achievement" style={{color:c}} dangerouslySetInnerHTML={{__html:stageSymbol(s)}} />{s}</span>)}<span className="route-key">┄ 원정 경로</span></div>
  </div>;
}
