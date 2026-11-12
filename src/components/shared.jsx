import { THEMES } from '../data/themes';
export const riskColor = r => {
  const t = Math.min(1, r / .5), a = [46, 139, 120], b = [224, 165, 38], c = [194, 37, 107];
  const [p, q, u] = t < .5 ? [a, b, t * 2] : [b, c, (t - .5) * 2];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * u)).join(',')})`;
};
export const pct = x => `${Math.round(x * 100)}%`;
export function Chip({ id, data, onOpen }) {
  const l = data.lessonById[id]; if (!l) return null;
  return <button className="chip" onClick={() => onOpen(id)} title={`${THEMES[l.themeId].label} · ${l.projectId}`}>ICR {l.projectId} p.{l.page}</button>;
}
export function Meter({ value, base, label }) {
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><b>{pct(value)}</b></div>
      <div className="meter-track" role="img" aria-label={`${label} ${pct(value)}, cohort baseline ${pct(base)}`}>
        <i style={{ width: `${Math.min(100, value * 100 / .8 * 1)}%`, background: riskColor(value) }} />
        <u style={{ left: `${Math.min(100, base * 100 / .8)}%` }} title={`Cohort baseline ${pct(base)}`} />
      </div>
    </div>
  );
}
