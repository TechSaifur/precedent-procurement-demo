import { useApp } from '../store';

const ROWS = [
  ['1 · Ingestion and knowledge representation', 'Knowledge graph', 'Exact joins on Project ID and ISO3 + year; derived joins (sector, time, theme) carry a confidence score. Section-bounded chunks with page and chunk IDs.', 'Layout-aware PDF parsing, Neo4j or Postgres + pgvector, entity resolution with reviewer queue'],
  ['2 · Prediction and retrieval', 'Risk lab, precedent map', 'Kaplan–Meier time-to-award with censoring, logistic re-tender and amendment models with driver bars, hybrid retrieval fused with RRF.', 'Calibrated gradient-boosted trees, Cox / AFT survival, BM25 + dense embeddings + cross-encoder rerank'],
  ['3 · Guardrails and attribution', 'Copilot, Trust view', 'Every claim cites a passage or a model output or is withheld. ISR vs ICR conflicts are weighed in a visible ledger.', 'Claim-level NLI entailment check, citation-span verification, audit log'],
  ['4 · Learning and rollout', 'Learning loop, Pilot plan', 'Ingest a batch of new reports, reviewer gate, index update, model refit, see the change for your draft.', 'Versioned indices and models, drift monitors, shadow-mode pilot'],
];
const STACK = [
  ['CopilotKit', 'Chat, shared state (useCopilotReadable) and frontend actions (useCopilotAction) in the real build. The demo’s agent is scripted and returns the same shape of output.'],
  ['A2UI', 'The agent returns declarative component JSON; the client renders only registered components. See “View UI spec” in any answer.'],
  ['Kepler.gl / deck.gl on Mapbox', 'The map mimics Kepler’s layers, filters and time playback. In the real build, swap in kepler.gl or deck.gl layers on a Mapbox basemap.'],
  ['Bit.dev', 'Each component (map layer panel, claim list, source drawer, risk meter) is self-contained so it can be exported as a versioned Bit component.'],
  ['Playwright', 'End-to-end tests cover the grounding and withheld-claim path, map-to-copilot linking and the learning loop.'],
];
export default function About() {
  const { state, dispatch } = useApp(); if (!state.about) return null;
  const close = () => dispatch({ type: 'about', value: false });
  return (
    <div className="about-bg" onClick={close}>
      <div className="about" role="dialog" aria-label="About this demo" onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && close()}>
        <header><div><h2>How this demo answers the brief</h2><p className="muted">All records and passages are synthetic and shaped like World Bank schemas. Nothing here is a real finding.</p></div><button className="icon-btn" onClick={close} autoFocus aria-label="Close">✕</button></header>
        <table><thead><tr><th>Module</th><th>Where to look</th><th>What it shows</th><th>Production version</th></tr></thead>
          <tbody>{ROWS.map(r => <tr key={r[0]}>{r.map((c, i) => i ? <td key={i}>{c}</td> : <th key={i}>{c}</th>)}</tr>)}</tbody></table>
        <h3>Stack mapping</h3>
        <table><tbody>{STACK.map(r => <tr key={r[0]}><th>{r[0]}</th><td>{r[1]}</td></tr>)}</tbody></table>
        <p className="muted small">Try: ask “Will standard documents guarantee no re-tender?” to see a claim get withheld. Then open Trust and learning and ingest a new batch of reports.</p>
      </div>
    </div>
  );
}
