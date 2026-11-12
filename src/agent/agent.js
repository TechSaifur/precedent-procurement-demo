import { THEMES } from '../data/themes';
import { COUNTRIES, BY_ISO } from '../data/countries';
import { feats } from '../model/logistic';
import { themeCounts } from '../model/retrieve';
import { findConflicts, resolve } from '../model/graph';

// A deterministic stand-in for the LLM planner. It still follows the production contract:
// 1) call tools, 2) emit a declarative UI spec (A2UI-style JSON), 3) pass every claim through the grounding validator.
const pct = x => Math.round(x * 100);
const months = d => (d / 30).toFixed(1);

export function classify(q) {
  const s = q.toLowerCase();
  if (/guarantee|definitely|certain|always|never fail/.test(s)) return 'guardrail';
  if (/conflict|contradict|isr|disagree/.test(s)) return 'conflict';
  if (/risk|re-?tender|rebid|amend|cancel/.test(s)) return 'risk';
  if (/plan|schedule|timeline|how long|duration|take/.test(s)) return 'plan';
  if (/spec|\btor\b|qualif|packag|gap/.test(s)) return 'spec';
  if (COUNTRIES.some(c => s.includes(c.name.toLowerCase()))) return 'focus';
  return 'help';
}

// Grounding validator: a claim survives only if every cited passage exists and matches the claim's theme,
// or it points to a model output that actually exists. Everything else is withheld, not softened.
export function validate(claims, data, ctx) {
  return claims.map(c => {
    if (c.model) return { ...c, status: ctx.models ? 'grounded' : 'withheld', reason: 'Model output' };
    if (!c.src || !c.src.length) return { ...c, status: 'withheld', reason: 'No supporting passage found in the corpus' };
    const missing = c.src.filter(id => !data.lessonById[id]);
    if (missing.length) return { ...c, status: 'withheld', reason: `Cited passage not found: ${missing[0]}` };
    const off = c.theme && c.src.some(id => data.lessonById[id].themeId !== c.theme);
    if (off) return { ...c, status: 'withheld', reason: 'Passage does not support this claim' };
    return { ...c, status: 'grounded' };
  });
}

export function runAgent(q, ctx) {
  const { country, data, precedents, summary, model, draftC, cohort } = ctx;
  const draft = ctx.state.draft;
  const intent = classify(q), trace = [], spec = [];
  const T = (tool, args, out) => trace.push({ tool, args, out });
  const x = feats(draftC), pR = model.rebid.p(x), pA = model.amend.p(x);
  const themes = themeCounts(precedents);
  // Prefer passages from the retrieved precedents; fall back to same-sector, then any, passages in the corpus.
  const themeEntry = id => themes.find(t => t.id === id) || (() => {
    const all = data.lessons.filter(l => l.themeId === id);
    const same = all.filter(l => data.contracts.find(c => c.projectId === l.projectId)?.sector === draft.sector);
    const ids = (same.length ? same : all).slice(0, 3).map(l => l.id);
    return ids.length ? { id, count: ids.length, ids } : null;
  })();
  const top = themes.filter(t => THEMES[t.id].kind === 'risk').slice(0, 3);
  const ids = precedents.map(p => p.c.id);
  const themeClaims = list => list.map(t => ({ text: THEMES[t.id].claim, src: t.ids.slice(0, 2), theme: t.id }));
  const passageCount = precedents.reduce((n, p) => n + p.lessons.length, 0);

  const retrieveStep = () => T('retrieve_precedents', `sector=${draft.sector}, category=${draft.cat}, value≈$${draft.valueM}M, country=${country.iso}`, `${precedents.length} projects · ${passageCount} passages · fused structured + lexical (RRF)`);
  const scoreStep = () => T('score_risk', `model=rebid_v1, features=${x.length}`, `P(re-tender)=${pct(pR)}% · P(amendment)=${pct(pA)}%`);
  const kmStep = () => T('benchmark_timeline', cohort.rule, `n=${cohort.rows.length} · median ${summary.median ?? '—'} d · p80 ${summary.p80 ?? '—'} d`);

  let claims = [], text = '';
  if (intent === 'plan') {
    retrieveStep(); kmStep(); scoreStep();
    text = `For a ${draft.cat.toLowerCase()} package like this in ${country.name}, here is the schedule evidence and what to protect against.`;
    claims = [
      { text: `Comparable ${draft.cat.toLowerCase()} tenders reach award in a median of ${summary.median} days (80th percentile ${summary.p80}). Budget about ${months(summary.p80)} months from invitation to signature.`, model: 'km_cohort' },
      { text: `Estimated probability of re-tender or cancellation is ${pct(pR)}%, against a cohort baseline of ${pct(model.base.rebid)}%.`, model: 'rebid_v1' },
      ...themeClaims(top.slice(0, 2)),
    ];
    spec.push({ type: 'Claims', props: { claims } });
    spec.push({ type: 'TimelineCard', props: { median: summary.median, p80: summary.p80, n: cohort.rows.length, rule: cohort.rule } });
    spec.push({ type: 'PrecedentList', props: { ids: ids.slice(0, 3) } });
    spec.push({ type: 'Checklist', props: { title: 'Build into the plan', items: top.map(t => THEMES[t.id].fix) } });
    spec.push({ type: 'MapAction', props: { label: `Show ${ids.length} precedents on the map`, action: { type: 'highlight', ids } } });
  } else if (intent === 'risk') {
    retrieveStep(); scoreStep();
    text = `Risk read for this draft, with the drivers behind the score and the precedents that show how it played out.`;
    claims = [{ text: `Estimated probability of re-tender or cancellation is ${pct(pR)}%; of at least one amendment, ${pct(pA)}%.`, model: 'rebid_v1' }, ...themeClaims(top)];
    spec.push({ type: 'RiskCard', props: { pR, pA, baseR: model.base.rebid, baseA: model.base.amend } });
    spec.push({ type: 'Claims', props: { claims } });
    spec.push({ type: 'Checklist', props: { title: 'Mitigations drawn from precedent', items: top.map(t => THEMES[t.id].fix) } });
    spec.push({ type: 'MapAction', props: { label: 'Open the risk lab', action: { type: 'view', view: 'risk' } } });
  } else if (intent === 'spec') {
    retrieveStep();
    const pool = ['spec_mismatch', 'capacity', 'low_competition', 'success_standard'].map(themeEntry).filter(Boolean);
    T('search_passages', 'themes=[specification, qualification, competition]', `${pool.reduce((n, t) => n + t.count, 0)} passages matched`);
    text = `Tender-design checks drawn from similar packages. Compare your ToR and qualification criteria against these before release.`;
    claims = themeClaims(pool.slice(0, 3));
    spec.push({ type: 'Claims', props: { claims } });
    spec.push({ type: 'PrecedentList', props: { ids: ids.slice(0, 3) } });
    spec.push({ type: 'Checklist', props: { title: 'Specification review', items: pool.map(t => THEMES[t.id].fix) } });
  } else if (intent === 'conflict') {
    const all = findConflicts(data), mine = all.filter(c => precedents.some(p => p.c.projectId === c.pid));
    const cf = mine[0] || all[0];
    T('detect_conflicts', 'ISR rating ≥ MS vs ICR failure theme', `${all.length} conflicts in corpus · ${mine.length} among precedents`);
    if (!cf) { text = 'No conflicting evidence found in the current corpus.'; }
    else {
      const r = resolve(cf);
      T('weigh_evidence', 'recency, authority, specificity, corroboration', `${r.winner} prevails (${r.icr.toFixed(2)} vs ${r.isr.toFixed(2)})`);
      text = `Two documents disagree on ${cf.pid}. I weighed them instead of picking one.`;
      claims = [{ text: `The completion report records a failure that the mid-term supervision report rated as acceptable. The award record corroborates the completion report.`, src: [cf.icr.id], theme: cf.icr.themeId }];
      spec.push({ type: 'Claims', props: { claims } });
      spec.push({ type: 'ConflictCard', props: { pid: cf.pid } });
      spec.push({ type: 'MapAction', props: { label: 'Open the evidence ledger', action: { type: 'trust', tab: 'conflicts' } } });
    }
  } else if (intent === 'guardrail') {
    retrieveStep();
    T('search_passages', 'claim="standard documents guarantee no re-tender"', '0 passages assert a guarantee');
    const good = themeEntry('success_standard') || { ids: [] };
    text = 'I can’t confirm that. Here is what the evidence supports instead.';
    claims = [
      { text: 'Standardised documents guarantee that no re-tender will occur.', src: [] },
      { text: THEMES.success_standard.claim, src: good.ids.slice(0, 2), theme: 'success_standard' },
    ];
    spec.push({ type: 'Claims', props: { claims } });
  } else if (intent === 'focus') {
    const c = COUNTRIES.find(c => q.toLowerCase().includes(c.name.toLowerCase()));
    const n = data.contracts.filter(k => k.iso === c.iso).length;
    T('focus_map', `country=${c.iso}`, `${n} contracts in ${c.name}`);
    text = `${c.name} has ${n} contracts in the dataset (governance index ${c.gov}, illustrative).`;
    spec.push({ type: 'MapAction', props: { label: `Zoom to ${c.name}`, action: { type: 'focus', iso: c.iso } } });
  } else {
    text = 'I can plan a schedule, score risk, review specifications, compare conflicting evidence, or focus the map on a country. Pick one below.';
  }
  if (claims.length) {
    spec.forEach(n => { if (n.type === 'Claims') n.props.claims = validate(n.props.claims, data, { models: true }); });
  }
  const all = spec.filter(n => n.type === 'Claims').flatMap(n => n.props.claims);
  if (all.length) spec.unshift({ type: 'Grounding', props: { total: all.length, ok: all.filter(c => c.status === 'grounded').length } });
  return { intent, text, trace, spec };
}
export const SUGGESTIONS = {
  plan: ['How long will this tender take?', 'What are the main risks of re-tender?', 'Review the specification for gaps'],
  package: ['Review the specification for gaps', 'Will standard documents guarantee no re-tender?', 'Where do documents conflict?'],
  monitor: ['Where do ISR and ICR conflict?', 'What are the main risks of re-tender?', 'Show Kenya on the map'],
  learn: ['Where do ISR and ICR conflict?', 'How long will this tender take?', 'Show Malawi on the map'],
};
