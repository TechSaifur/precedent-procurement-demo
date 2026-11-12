import { useEffect, useMemo, useRef, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import 'd3-transition';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { useApp } from '../store';
import { BY_ISO, COUNTRIES } from '../data/countries';
import { CATS } from '../data/generate';
import { feats } from '../model/logistic';
import { riskColor, pct } from '../components/shared';
import { THEMES } from '../data/themes';

const FC = (() => { const f = feature(world, world.objects.countries); return { type: 'FeatureCollection', features: f.features.filter(x => +x.id !== 10) }; })();
const CAT_COLOR = { Works: '#2447D8', Goods: '#2E8B78', Consultancies: '#8A4FBF', 'Non-consulting': '#B8862B' };
const govFill = g => { const t = 1 - g / 70, a = [227, 234, 240], b = [143, 167, 189]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t)))).join(',')})`; };

export default function MapView() {
  const { state, dispatch, data, model, precedents, country } = useApp();
  const { filters: F, layers: L } = state;
  const wrap = useRef(), svg = useRef(), zoomer = useRef();
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [tf, setTf] = useState({ k: 1, x: 0, y: 0 });
  const [tip, setTip] = useState(null);
  const [play, setPlay] = useState(false);
  const maxYear = state.batch ? 2026 : 2025;

  useEffect(() => { const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(320, e.contentRect.width), h: Math.max(320, e.contentRect.height) })); ro.observe(wrap.current); return () => ro.disconnect(); }, []);
  const proj = useMemo(() => geoEqualEarth().fitExtent([[8, 8], [size.w - 8, size.h - 8]], FC), [size]);
  const path = useMemo(() => geoPath(proj), [proj]);
  const land = useMemo(() => FC.features.map(f => ({ id: +f.id, d: path(f) })), [path]);
  const govByN = useMemo(() => Object.fromEntries(COUNTRIES.map(c => [c.n, c])), []);

  useEffect(() => {
    const z = zoom().scaleExtent([1, 14]).translateExtent([[0, 0], [size.w, size.h]]).on('zoom', e => setTf({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    zoomer.current = z; select(svg.current).call(z).on('dblclick.zoom', null);
  }, [size]);
  useEffect(() => {
    if (!state.focus) return; const c = BY_ISO[state.focus.iso], [px, py] = proj([c.lon, c.lat]), k = 4.5;
    select(svg.current).transition().duration(700).call(zoomer.current.transform, zoomIdentity.translate(size.w / 2 - k * px, size.h / 2 - k * py).scale(k));
  }, [state.focus]);
  useEffect(() => { if (!play) return; const id = setInterval(() => dispatch({ type: 'filters', patch: { yearMax: state.filters.yearMax >= maxYear ? 2013 : state.filters.yearMax + 1 } }), 650); return () => clearInterval(id); }, [play, state.filters.yearMax, maxYear]);

  const scored = useMemo(() => data.contracts.map(c => ({ ...c, risk: model.rebid.p(feats(c)), p: proj([c.lon, c.lat]) })), [data, model, proj]);
  const vis = scored.filter(c => F.cats.includes(c.cat) && c.year >= F.yearMin && c.year <= F.yearMax && c.risk >= F.riskMin);
  const hist = useMemo(() => { const h = {}; for (let y = 2012; y <= maxYear; y++) h[y] = 0; scored.filter(c => F.cats.includes(c.cat)).forEach(c => h[c.year]++); return h; }, [scored, F.cats, maxYear]);
  const hmax = Math.max(...Object.values(hist));
  const dp = proj([country.lon, country.lat]);
  const hi = state.highlight.map(id => scored.find(c => c.id === id)).filter(Boolean);
  const sel = state.selected && scored.find(c => c.id === state.selected);
  const col = c => state.colorBy === 'risk' ? riskColor(c.risk) : CAT_COLOR[c.cat];
  const toggleCat = c => dispatch({ type: 'filters', patch: { cats: F.cats.includes(c) ? F.cats.filter(x => x !== c) : [...F.cats, c] } });

  return (
    <div className="mapview" ref={wrap}>
      <svg ref={svg} width={size.w} height={size.h} role="img" aria-label="World map of contract awards coloured by predicted re-tender risk" onMouseLeave={() => setTip(null)}>
        <rect width={size.w} height={size.h} className="sea" />
        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.k})`}>
          {land.map(f => { const g = govByN[f.id]; return <path key={f.id} d={f.d} className="land" style={{ fill: L.gov && g ? govFill(g.gov) : undefined, strokeWidth: .5 / tf.k }} />; })}
          {L.arcs && hi.map(c => { const [x1, y1] = dp, [x2, y2] = c.p, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * .22;
            return <path key={'a' + c.id} d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} className="arc" style={{ strokeWidth: 1.4 / tf.k }} />; })}
          {L.points && vis.map(c => (
            <circle key={c.id} cx={c.p[0]} cy={c.p[1]} r={(1.6 + Math.sqrt(c.valueM) * .55) / Math.pow(tf.k, .65)} fill={col(c)} fillOpacity={.72}
              stroke={state.selected === c.id ? '#14212B' : state.highlight.includes(c.id) ? '#2447D8' : 'rgba(255,255,255,.7)'} strokeWidth={(state.selected === c.id || state.highlight.includes(c.id) ? 1.6 : .5) / tf.k}
              tabIndex={tf.k > 3 ? 0 : -1} onClick={() => dispatch({ type: 'select', id: c.id })} onFocus={() => dispatch({ type: 'select', id: c.id })}
              onMouseLeave={() => setTip(null)} onMouseMove={e => { const r = wrap.current.getBoundingClientRect(); setTip({ c, x: e.clientX - r.left, y: e.clientY - r.top }); }} />
          ))}
          <g transform={`translate(${dp[0]},${dp[1]})`}><circle className="pulse" r={9 / tf.k} style={{ strokeWidth: 1.6 / tf.k }} /><circle r={4 / tf.k} className="draft-dot" style={{ strokeWidth: 1.5 / tf.k }} /></g>
        </g>
      </svg>

      <div className="panel layers" role="group" aria-label="Map layers and filters">
        <h3>Layers</h3>
        {[['points', 'Contract awards'], ['arcs', 'Precedent links'], ['gov', 'Governance shading']].map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={L[k]} onChange={() => dispatch({ type: 'layer', key: k })} />{l}</label>)}
        <h3>Colour by</h3>
        <div className="seg">{[['risk', 'Predicted risk'], ['cat', 'Category']].map(([k, l]) => <button key={k} className={state.colorBy === k ? 'on' : ''} onClick={() => dispatch({ type: 'colorBy', value: k })}>{l}</button>)}</div>
        <h3>Category</h3>
        <div className="cats">{CATS.map(c => <button key={c} className={F.cats.includes(c) ? 'on' : ''} onClick={() => toggleCat(c)}><i style={{ background: CAT_COLOR[c] }} />{c}</button>)}</div>
        <h3>Minimum predicted risk <b>{pct(F.riskMin)}</b></h3>
        <input type="range" min="0" max="0.4" step=".01" value={F.riskMin} onChange={e => dispatch({ type: 'filters', patch: { riskMin: +e.target.value } })} aria-label="Minimum predicted risk" />
        <p className="muted small">{vis.length} of {data.contracts.length} contracts shown</p>
      </div>

      <div className="panel legend" aria-hidden="true">
        {state.colorBy === 'risk' ? <><small>Re-tender risk</small><div className="ramp" /><div className="ramp-l"><span>low</span><span>high</span></div></> : CATS.map(c => <div key={c} className="lg"><i style={{ background: CAT_COLOR[c] }} />{c}</div>)}
        <small>Size = award value · shading = weaker governance (illustrative)</small>
      </div>

      {sel && <div className="panel detail">
        <header><b>{sel.desc}</b><button className="icon-btn" onClick={() => dispatch({ type: 'select', id: null })} aria-label="Close detail">✕</button></header>
        <p className="muted small">{BY_ISO[sel.iso].name} · {sel.year} · {sel.cat} · {sel.method} · ${sel.valueM}M</p>
        <div className="kv"><span>Supplier</span><b>{sel.supplier}</b><span>Tender duration</span><b>{sel.tenderDays} d{sel.event ? '' : ' (still open)'}</b><span>Amendments</span><b>{sel.amendments}</b><span>Re-tendered</span><b>{sel.rebid ? 'Yes' : 'No'}</b><span>Complexity</span><b>{sel.cx ?? 'not reported'}</b><span>Predicted risk</span><b style={{ color: riskColor(sel.risk) }}>{pct(sel.risk)}</b></div>
        {(data.lessonsByProject[sel.projectId] || []).length ? <div><small className="muted">Lessons for {sel.projectId}</small>{data.lessonsByProject[sel.projectId].map(l => <button key={l.id} className="lesson" onClick={() => dispatch({ type: 'source', id: l.id })}><span className={`k ${l.kind}`} />{THEMES[l.themeId].label}<em>ICR p.{l.page}</em></button>)}</div>
          : <p className="muted small">No completion report available for {sel.projectId}. Predictions rely on structured fields only.</p>}
        <button className="btn" onClick={() => dispatch({ type: 'graphProject', id: sel.projectId })}>Open in knowledge graph</button>
      </div>}

      {tip && !sel && <div className="tip" style={{ left: tip.x + 12, top: tip.y + 12 }}><b>{tip.c.desc}</b><br />{BY_ISO[tip.c.iso].name} · ${tip.c.valueM}M · risk {pct(tip.c.risk)}</div>}

      <div className="panel scrub">
        <button className="btn" onClick={() => setPlay(p => !p)} aria-pressed={play}>{play ? 'Pause' : 'Play'}</button>
        <div className="scrub-main">
          <div className="bars" aria-hidden="true">{Object.entries(hist).map(([y, n]) => <i key={y} style={{ height: `${n / hmax * 100}%`, opacity: +y <= F.yearMax ? 1 : .25 }} />)}</div>
          <input type="range" min="2012" max={maxYear} value={F.yearMax} onChange={e => dispatch({ type: 'filters', patch: { yearMax: +e.target.value } })} aria-label="Show awards up to year" />
        </div>
        <b>2012 – {F.yearMax}</b>
      </div>
    </div>
  );
}
