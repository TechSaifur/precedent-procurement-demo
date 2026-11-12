import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { findConflicts, resolve } from '../model/graph';
import { BY_ISO } from '../data/countries';
import { THEMES } from '../data/themes';
import { feats } from '../model/logistic';
import { pct } from '../components/shared';

const TABS = [['conflicts', 'Conflicting evidence'], ['loop', 'Learning loop'], ['pilot', 'Pilot plan']];
export default function TrustView() {
  const { state, dispatch } = useApp();
  return (
    <div className="trust">
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={state.trustTab === k} className={state.trustTab === k ? 'on' : ''} onClick={() => dispatch({ type: 'trustTab', tab: k })}>{l}</button>)}</div>
      {state.trustTab === 'conflicts' && <Conflicts />}
      {state.trustTab === 'loop' && <Loop />}
      {state.trustTab === 'pilot' && <Pilot />}
    </div>
  );
}

function Conflicts() {
  const { data, dispatch } = useApp();
  const list = useMemo(() => findConflicts(data), [data]);
  const [i, setI] = useState(0); const cf = list[Math.min(i, list.length - 1)];
  if (!cf) return <p className="muted">No conflicts detected in this corpus.</p>;
  const r = resolve(cf), c = data.contracts.find(x => x.projectId === cf.pid);
  return (
    <div className="conf">
      <aside className="conf-list"><h3>{list.length} conflicts found</h3><p className="muted small">Mid-term ISR rated procurement acceptable, but the completion report records a failure and the award data shows a re-tender.</p>
        {list.map((x, k) => <button key={x.pid} className={k === i ? 'on' : ''} onClick={() => setI(k)}><b>{x.pid}</b><span>{BY_ISO[data.contracts.find(c => c.projectId === x.pid).iso].name} · ISR {x.isr.rating}</span></button>)}</aside>
      <div className="conf-main">
        <div className="three">
          <article><small>Supervision report (ISR {cf.isr.year}) · rating {cf.isr.rating}</small><p>{cf.isr.text}</p></article>
          <article><small>Completion report (ICR {cf.icr.year}) · p.{cf.icr.page}</small><p className="quote">{cf.icr.text}</p><button className="chip" onClick={() => dispatch({ type: 'source', id: cf.icr.id })}>Open passage</button></article>
          <article><small>Award record {cf.contract.id}</small><div className="kv"><span>Re-tender</span><b>Yes</b><span>Amendments</span><b>{cf.contract.amendments}</b><span>Tender days</span><b>{cf.contract.tenderDays}</b><span>Supplier</span><b>{cf.contract.supplier}</b></div></article>
        </div>
        <h3>Evidence ledger</h3>
        <table className="ledger"><thead><tr><th>Rule</th><th>Reason</th><th>ICR</th><th>ISR</th><th>Weight</th></tr></thead>
          <tbody>{r.rules.map(x => <tr key={x.k}><td>{x.k}</td><td>{x.d}</td><td>{x.icr.toFixed(1)}</td><td>{x.isr.toFixed(1)}</td><td>{x.w}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan="2">Weighted score</td><td>{r.icr.toFixed(2)}</td><td>{r.isr.toFixed(2)}</td><td /></tr></tfoot></table>
        <div className="verdict big"><b>{r.winner} prevails for risk scoring.</b> The ISR is kept as context (“rated acceptable at the time”) and the project is flagged for a reviewer. Neither document is deleted or overwritten.</div>
      </div>
    </div>
  );
}

const STEPS = ['Fetch new ICRs', 'Parse layout and tables', 'Chunk by section', 'Link to Project ID', 'Extract lessons', 'Reviewer approves', 'Update vector index', 'Refit risk models'];
function Loop() {
  const { state, dispatch, models, draftC, data } = useApp();
  const [step, setStep] = useState(state.batch ? STEPS.length : -1);
  useEffect(() => { if (step < 0 || step >= STEPS.length) return; const t = setTimeout(() => { setStep(s => s + 1); }, 650); return () => clearTimeout(t); }, [step]);
  useEffect(() => { if (step === STEPS.length && !state.batch) dispatch({ type: 'batch', value: 1 }); }, [step]);
  const x = feats(draftC), before = models.base.rebid.p(x), after = models.ext.rebid.p(x);
  const done = state.batch === 1;
  return (
    <div className="loop">
      <div className="loop-main">
        <h3>New completion reports become new evidence</h3>
        <p className="muted">Run the loop with a simulated batch of 34 completion reports published in 2026, all Energy projects in weaker-governance countries.</p>
        <ol className="pipe">{STEPS.map((s, k) => <li key={s} className={k < step ? 'done' : k === step ? 'run' : ''}><i />{s}{k === 5 && <em>human in the loop</em>}</li>)}</ol>
        <div className="row"><button className="btn primary" disabled={step >= 0 && step < STEPS.length} onClick={() => { dispatch({ type: 'batch', value: 0 }); setStep(0); }}>{done ? 'Run again' : 'Ingest new reports'}</button>
          <button className="btn" onClick={() => { dispatch({ type: 'batch', value: 0 }); setStep(-1); }} disabled={!done && step < 0}>Reset</button></div>
      </div>
      <div className="loop-out">
        <h3>What changed for your draft</h3>
        <div className="delta"><div><small>Re-tender risk before</small><b>{pct(before)}</b></div><span>→</span><div><small>after refit</small><b className={after > before ? 'up' : ''}>{done ? pct(after) : '—'}</b></div></div>
        <div className="kv"><span>Contracts indexed</span><b>{done ? models.ext.n : models.base.n}</b><span>Passages indexed</span><b>{data.lessons.length}</b><span>Drift trigger</span><b>Outcome rate shift in segment</b><span>Rollback</span><b>Versioned indices and models</b></div>
        <p className="muted small">Safeguards: every extracted lesson is reviewed before it enters the index. Each model version is evaluated on a hold-out window before it replaces the live one.</p>
      </div>
    </div>
  );
}

const PHASES = [
  { n: 'Phase 1 · 8 weeks', t: 'Shadow mode', d: 'One regional procurement team, one sector. Copilot runs beside the normal process and nothing it says is acted on without review.', k: [['Retrieval precision@5 of relevant lessons', 'blind-rated by two procurement specialists'], ['Claims anchored to a source', 'validator log, target 100% shown'], ['Planning cycle time', 'baseline timing from 20 past plans']] },
  { n: 'Phase 2 · 12 weeks', t: 'Assisted planning', d: 'Add tender-design checks and the risk lab for three sectors. Teams use outputs in real plans.', k: [['Reduction in planning cycle time', 'time-to-draft vs matched baseline'], ['Re-tender rate on assisted packages', 'tracked against matched non-assisted'], ['Weekly active planners', 'product analytics']] },
  { n: 'Phase 3 · ongoing', t: 'Monitoring and learning', d: 'Turn on early-warning flags from supervision data and the reviewed ingestion loop.', k: [['Lead time of slippage warnings', 'days before the amendment is filed'], ['Reviewer override rate', 'drift signal for models'], ['Lesson reuse', 'lessons cited in approved plans']] },
];
function Pilot() {
  return <div className="pilot">{PHASES.map(p => <section key={p.n} className="panel"><small>{p.n}</small><h3>{p.t}</h3><p>{p.d}</p><table><tbody>{p.k.map(([a, b]) => <tr key={a}><th>{a}</th><td>{b}</td></tr>)}</tbody></table></section>)}</div>;
}
