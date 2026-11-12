import { useApp } from '../store';
import { THEMES } from '../data/themes';
import { BY_ISO } from '../data/countries';
import { Chip, Meter, pct, riskColor } from './shared';
import { resolve, findConflicts } from '../model/graph';
import { feats } from '../model/logistic';

// A2UI-style catalogue: the agent returns JSON { type, props }; the client owns the components.
// Anything the agent can show is a registered type — it cannot inject arbitrary markup.
function useAct() {
  const { dispatch } = useApp();
  return a => {
    if (a.type === 'trust') { dispatch({ type: 'view', view: 'trust' }); dispatch({ type: 'trustTab', tab: a.tab }); }
    else dispatch(a);
  };
}

function Grounding({ total, ok }) {
  const all = ok === total;
  return <div className={`ground ${all ? 'ok' : 'warn'}`}><span className="dot" />Grounding check: {ok} of {total} claims anchored{all ? '' : `, ${total - ok} withheld`}</div>;
}
function Claims({ claims }) {
  const { data, dispatch } = useApp();
  return (
    <ul className="claims">
      {claims.map((c, i) => c.status === 'grounded' ? (
        <li key={i}>
          <span>{c.text}</span>{' '}
          {c.model ? <button className="chip model" onClick={() => dispatch({ type: 'view', view: 'risk', keepCopilot: true })}>Model {c.model}</button>
            : c.src.map(id => <Chip key={id} id={id} data={data} onOpen={id => dispatch({ type: 'source', id })} />)}
        </li>
      ) : (
        <li key={i} className="withheld"><s>{c.text}</s><small>Withheld: {c.reason}.</small></li>
      ))}
    </ul>
  );
}
function TimelineCard({ median, p80, n, rule }) {
  const max = p80 * 1.15;
  return (
    <div className="card">
      <h4>Tender-to-award benchmark</h4>
      <div className="tl"><div className="tl-bar"><i style={{ width: `${median / max * 100}%` }} /><i className="p80" style={{ left: `${median / max * 100}%`, width: `${(p80 - median) / max * 100}%` }} /></div>
        <div className="tl-lab"><span>Median {median} d</span><span>80% by {p80} d</span></div></div>
      <small className="muted">Kaplan–Meier on n={n} · {rule}</small>
    </div>
  );
}
function PrecedentList({ ids }) {
  const { data, dispatch, precedents } = useApp();
  return (
    <div className="card">
      <h4>Closest precedents</h4>
      {ids.map(id => {
        const p = precedents.find(x => x.c.id === id) || { c: data.byId[id], struct: 0, lex: 0, lessons: [] }; const c = p.c;
        return (
          <button key={id} className="prec" onClick={() => { dispatch({ type: 'select', id }); dispatch({ type: 'focus', iso: c.iso }); }}>
            <b>{c.desc}</b>
            <span>{BY_ISO[c.iso].name} · {c.year} · ${c.valueM}M · {c.cat}</span>
            <span className="muted">match: structure {Math.round(p.struct * 100)}% · text {Math.round(p.lex * 100)}%</span>
          </button>
        );
      })}
    </div>
  );
}
function Checklist({ title, items }) {
  return <div className="card"><h4>{title}</h4><ul className="check">{items.map((t, i) => <li key={i}><label><input type="checkbox" /> <span>{t}</span></label></li>)}</ul></div>;
}
function MapAction({ label, action }) {
  const act = useAct();
  return <button className="btn primary" onClick={() => act(action)}>{label}</button>;
}
function RiskCard({ pR, pA, baseR, baseA }) {
  return <div className="card"><h4>Predicted risk</h4><Meter value={pR} base={baseR} label="Re-tender or cancellation" /><Meter value={pA} base={baseA} label="At least one amendment" /><small className="muted">Tick marks show the portfolio baseline.</small></div>;
}
function ConflictCard({ pid }) {
  const { data, dispatch } = useApp();
  const cf = findConflicts(data).find(c => c.pid === pid); if (!cf) return null; const r = resolve(cf);
  return (
    <div className="card">
      <h4>{pid}: ISR vs ICR</h4>
      <div className="two"><div><small className="muted">ISR {cf.isr.year} · rating {cf.isr.rating}</small><p>{cf.isr.text}</p></div>
        <div><small className="muted">ICR p.{cf.icr.page}</small><p className="quote">{cf.icr.text}</p></div></div>
      <div className="verdict"><b>{r.winner} prevails</b> <span className="muted">{r.icr.toFixed(2)} vs {r.isr.toFixed(2)}</span>
        <button className="chip" onClick={() => dispatch({ type: 'source', id: cf.icr.id })}>Read passage</button></div>
    </div>
  );
}
export const REGISTRY = { Grounding, Claims, TimelineCard, PrecedentList, Checklist, MapAction, RiskCard, ConflictCard };
export function Render({ spec }) {
  return spec.map((n, i) => { const C = REGISTRY[n.type]; return C ? <C key={i} {...n.props} /> : <div key={i} className="card muted">Unknown component “{n.type}” was ignored.</div>; });
}
