import { useApp } from '../store';
import { COUNTRIES } from '../data/countries';
import { SECTORS, CATS } from '../data/generate';
import { feats } from '../model/logistic';
import { pct, riskColor } from './shared';

const STAGES = [['plan', 'Plan'], ['package', 'Package'], ['monitor', 'Monitor'], ['learn', 'Learn']];
const METHODS = ['ICB', 'NCB', 'QCBS', 'Shortlist', 'Direct'];
export default function DraftPanel() {
  const { state, dispatch, model, draftC, summary, country, cohort } = useApp();
  const d = state.draft, set = patch => dispatch({ type: 'draft', patch });
  const pR = model.rebid.p(feats(draftC));
  // slider maps linearly 0..100 to $0.2M..$100M on a log scale
  const toS = v => Math.round(Math.log(v / .2) / Math.log(500) * 100), fromS = s => +(.2 * Math.pow(500, s / 100)).toFixed(1);
  return (
    <aside className={`rail ${state.railOpen ? 'open' : ''}`} aria-label="Draft procurement package">
      <div className="stages" role="tablist" aria-label="Lifecycle stage">
        {STAGES.map(([k, l]) => <button key={k} role="tab" aria-selected={state.stage === k} className={state.stage === k ? 'on' : ''} onClick={() => dispatch({ type: 'stage', stage: k })}>{l}</button>)}
      </div>
      <h2>Draft package</h2>
      <p className="muted small">The copilot reads these fields. Change them and every view updates.</p>
      <label>Description<textarea rows={3} value={d.desc} onChange={e => set({ desc: e.target.value })} /></label>
      <label>Country<select value={d.iso} onChange={e => { set({ iso: e.target.value }); dispatch({ type: 'focus', iso: e.target.value, keepView: true }); }}>{COUNTRIES.map(c => <option key={c.iso} value={c.iso}>{c.name}</option>)}</select></label>
      <div className="row2">
        <label>Sector<select value={d.sector} onChange={e => set({ sector: e.target.value })}>{SECTORS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Category<select value={d.cat} onChange={e => set({ cat: e.target.value })}>{CATS.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label>Procurement method<select value={d.method} onChange={e => set({ method: e.target.value })}>{METHODS.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Estimated value <b>${d.valueM}M</b><input type="range" min="0" max="100" value={toS(d.valueM)} onChange={e => set({ valueM: fromS(+e.target.value) })} /></label>
      <label>Technical complexity <b>{d.cx} of 5</b><input type="range" min="1" max="5" value={d.cx} onChange={e => set({ cx: +e.target.value })} /></label>
      <div className="quick" aria-live="polite">
        <div><small>Re-tender risk</small><b style={{ color: riskColor(pR) }}>{pct(pR)}</b></div>
        <div><small>Median to award</small><b>{summary.median} d</b></div>
        <div><small>Governance index</small><b>{country.gov}</b></div>
      </div>
      <p className="muted small">Cohort: {cohort.rows.length} comparable contracts. {cohort.rule}.</p>
    </aside>
  );
}
