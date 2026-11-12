import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { neighbourhood } from '../model/graph';
import { BY_ISO } from '../data/countries';
import { THEMES } from '../data/themes';

const TYPE = { Project: '#14212B', Contract: '#2447D8', Supplier: '#8A4FBF', Lesson: '#C2256B', ISR: '#B8862B', PAD: '#5B6B77', Country: '#2E8B78', Indicator: '#5FA89A', Theme: '#E0A526' };
const SCHEMA = [['Project', 'project_id'], ['Contract', 'contract_id → project_id'], ['Supplier', 'normalised name'], ['Lesson', 'passage_id → project_id, page'], ['ISR', 'report_id → project_id, date'], ['Indicator', 'iso3 + year']];

export default function GraphView() {
  const { state, dispatch, data, precedents } = useApp();
  const pid = state.graphProject || precedents[0]?.c.projectId || data.withDocs[0];
  const g = useMemo(() => neighbourhood(pid, data), [pid, data]);
  const [pick, setPick] = useState(null);
  const node = g.nodes.find(n => n.id === pick) || g.nodes.find(n => n.id === pid);
  const pos = Object.fromEntries(g.nodes.map(n => [n.id, n]));
  const links = g.edges.filter(e => e.source === node?.id || e.target === node?.id);
  const xs = g.nodes.map(n => n.x), ys = g.nodes.map(n => n.y);
  const pad = 60, minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad, W = Math.max(...xs) - minX + pad, H = Math.max(...ys) - minY + pad;

  return (
    <div className="graphview">
      <div className="graph-main">
        <div className="graph-bar">
          <label>Project <select value={pid} onChange={e => { dispatch({ type: 'graphProject', id: e.target.value }); setPick(null); }}>
            {data.withDocs.map(p => { const c = data.contracts.find(x => x.projectId === p); return <option key={p} value={p}>{p} · {c.sector} · {BY_ISO[c.iso].name}</option>; })}</select></label>
          <span className="muted small">{g.nodes.length} nodes · {g.edges.length} links. Solid = exact key join, dashed = derived with a confidence score.</span>
        </div>
        <svg viewBox={`${minX} ${minY} ${W} ${H}`} role="img" aria-label="Knowledge graph neighbourhood for the selected project">
          {g.edges.map((e, i) => { const a = pos[e.source], b = pos[e.target]; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`edge ${e.kind}`} opacity={links.includes(e) ? 1 : .45} />; })}
          {g.nodes.map(n => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} className={`gn ${node?.id === n.id ? 'on' : ''}`} tabIndex={0} role="button" aria-label={`${n.type} ${n.label}`} onClick={() => setPick(n.id)} onKeyDown={e => e.key === 'Enter' && setPick(n.id)}>
              <circle r={n.type === 'Project' && !n.neighbour ? 15 : 10} fill={TYPE[n.type]} fillOpacity={n.neighbour ? .55 : 1} />
              <text y={n.type === 'Project' && !n.neighbour ? 29 : 23} textAnchor="middle">{n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}</text>
            </g>
          ))}
        </svg>
        <div className="graph-legend">{Object.entries(TYPE).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}</div>
      </div>
      <aside className="inspector">
        <h3>{node?.type}: {node?.label}</h3>
        {node?.sub && <p className="muted">{node.sub}</p>}
        {node?.type === 'Lesson' && <><blockquote>{node.rec.text}</blockquote><button className="btn" onClick={() => dispatch({ type: 'source', id: node.id })}>Open source passage</button></>}
        {node?.type === 'Contract' && <div className="kv"><span>Supplier</span><b>{node.rec.supplier}</b><span>Value</span><b>${node.rec.valueM}M</b><span>Tender</span><b>{node.rec.tenderDays} d</b><span>Amendments</span><b>{node.rec.amendments}</b></div>}
        {node?.type === 'ISR' && <p>{node.rec.text}</p>}
        <h4>How this node is linked</h4>
        <ul className="links">{links.map((e, i) => { const o = pos[e.source === node.id ? e.target : e.source]; return <li key={i}><b>{o.label}</b><span>{e.how}</span><i className={e.kind}>{e.kind === 'exact' ? 'exact join' : `confidence ${Math.round(e.conf * 100)}%`}</i></li>; })}</ul>
        <h4>Schema and join keys</h4>
        <table className="schema"><tbody>{SCHEMA.map(([a, b]) => <tr key={a}><th><i style={{ background: TYPE[a] }} />{a}</th><td>{b}</td></tr>)}</tbody></table>
        <p className="muted small">Contracts link to ICR passages through Project ID first. Where an ID is missing, sector, time proximity and theme similarity propose a link that a reviewer confirms.</p>
      </aside>
    </div>
  );
}
