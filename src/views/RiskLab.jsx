import { useMemo } from 'react';
import { useApp } from '../store';
import { km } from '../model/km';
import { feats, FEATURE_NAMES } from '../model/logistic';
import { Meter, pct } from '../components/shared';

function Survival({ curve, all, median, p80 }) {
  // Plot cumulative share awarded (1 - S): rises from 0% to 100%.
  const W = 640, H = 300, m = { l: 44, r: 14, t: 12, b: 34 };
  const tmax = Math.min(520, Math.max(...curve.map(p => p.t), p80 || 0) * 1.1);
  const X = t => m.l + Math.min(t, tmax) / tmax * (W - m.l - m.r), Y = c => m.t + (1 - c) * (H - m.t - m.b);
  const steps = (pts, f) => { const o = []; pts.forEach((p, i) => { if (i) o.push([p.t, f(pts[i - 1])]); o.push([p.t, f(p)]); }); const l = pts[pts.length - 1]; o.push([tmax, f(l)]); return o; };
  const line = pts => pts.map(([t, c], i) => `${i ? 'L' : 'M'}${X(t)},${Y(c)}`).join(' ');
  const up = steps(curve, p => 1 - p.lo), dn = steps(curve, p => 1 - p.hi);
  const band = line(up) + ' ' + line([...dn].reverse()).replace('M', 'L') + 'Z';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Cumulative share of tenders awarded by day, with confidence band">
      {[0, .25, .5, .75, 1].map(c => <g key={c}><line x1={m.l} x2={W - m.r} y1={Y(c)} y2={Y(c)} className="grid" /><text x={m.l - 8} y={Y(c) + 4} textAnchor="end">{Math.round(c * 100)}%</text></g>)}
      {[0, 100, 200, 300, 400, 500].filter(t => t <= tmax).map(t => <text key={t} x={X(t)} y={H - 14} textAnchor="middle">{t}</text>)}
      <text x={W / 2} y={H - 1} textAnchor="middle" className="axis">Days from invitation to award</text>
      <path d={band} className="band" />
      <path d={line(steps(all, p => 1 - p.S))} className="allc" />
      <path d={line(steps(curve, p => 1 - p.S))} className="cohc" />
      {median && <g><line x1={X(median)} x2={X(median)} y1={Y(.5)} y2={H - m.b} className="mk" /><text x={X(median) + 5} y={Y(.5) + 14}>median {median} d</text></g>}
      {p80 && <g><line x1={X(p80)} x2={X(p80)} y1={Y(.8)} y2={H - m.b} className="mk" /><text x={X(p80) + 5} y={Y(.8) + 14}>80% by {p80} d</text></g>}
    </svg>
  );
}

export default function RiskLab() {
  const { state, dispatch, data, model, models, draftC, curve, cohort, summary } = useApp();
  const x = feats(draftC), pR = model.rebid.p(x), pA = model.amend.p(x);
  const all = useMemo(() => km(data.contracts.filter(c => c.cat === state.draft.cat).map(c => ({ t: c.tenderDays, e: c.event }))), [data, state.draft.cat]);
  const contrib = model.rebid.contrib(x).map((v, i) => ({ name: FEATURE_NAMES[i], v })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const maxC = Math.max(...contrib.map(c => Math.abs(c.v)), .1);
  const cens = cohort.rows.filter(c => !c.event).length;
  return (
    <div className="risklab">
      <section className="panel wide">
        <h3>Time to award</h3>
        <p className="muted small">Share of tenders awarded by each day (Kaplan–Meier, so tenders still open at the data cut-off are censored, not dropped), with a 95% Greenwood band. Dashed grey is every {state.draft.cat.toLowerCase()} tender.</p>
        <Survival curve={curve} all={all} median={summary.median} p80={summary.p80} />
        <p className="muted small">Cohort: {cohort.rows.length} contracts ({cens} still open). {cohort.rule}.</p>
      </section>
      <section className="panel">
        <h3>Predicted risk for this draft</h3>
        <Meter value={pR} base={model.base.rebid} label="Re-tender or cancellation" />
        <Meter value={pA} base={model.base.amend} label="At least one amendment" />
        <h4>What drives the re-tender score</h4>
        <div className="drivers">{contrib.map(c => <div key={c.name} className="drv"><span>{c.name}</span>
          <div className="axisline"><i className={c.v > 0 ? 'up' : 'dn'} style={{ width: `${Math.abs(c.v) / maxC * 50}%`, [c.v > 0 ? 'left' : 'right']: '50%' }} /></div></div>)}</div>
        <p className="muted small">Bars right of centre raise risk relative to the portfolio average; left lowers it.</p>
      </section>
      <section className="panel">
        <h3>Model card</h3>
        <div className="kv">
          <span>Method</span><b>Logistic regression (demo)</b>
          <span>Production</span><b>Calibrated GBT + survival</b>
          <span>Training rows</span><b>{model.n}</b>
          <span>Hold-out AUC, re-tender</span><b>{model.auc.rebid ? model.auc.rebid.toFixed(2) : 'n/a'}</b>
          <span>Hold-out AUC, amendment</span><b>{model.auc.amend ? model.auc.amend.toFixed(2) : 'n/a'}</b>
          <span>Validation</span><b>Train ≤2022, test 2023–25</b>
        </div>
        <h4>Gaps in the records</h4>
        <ul className="gaps">
          <li><b>{data.coverage.cxMissing}</b> of {data.contracts.length} contracts do not report complexity. They are imputed neutral and flagged as a feature, so “not reported” is itself a signal.</li>
          <li><b>{data.coverage.projects - data.coverage.withDocs}</b> of {data.coverage.projects} projects have no completion report. Retrieval skips them and the model uses structured fields only.</li>
          <li>Open tenders are censored, not dropped.</li>
        </ul>
        <p className="muted small">Scores are for prioritising review, not for deciding. Synthetic data, so the numbers show mechanics rather than real-world rates.</p>
      </section>
    </div>
  );
}
