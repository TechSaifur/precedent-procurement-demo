import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { runAgent, SUGGESTIONS } from '../agent/agent';
import { Render } from './A2UI';

export default function Copilot() {
  const app = useApp();
  const { state, dispatch } = app;
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSpec, setShowSpec] = useState({});
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const ask = text => {
    if (!text.trim() || busy) return;
    setBusy(true); setQ('');
    const res = runAgent(text, app);
    const id = Date.now();
    setMsgs(m => [...m, { id, role: 'user', text }, { id: id + 1, role: 'agent', text: '', trace: [], spec: [], done: false }]);
    res.trace.forEach((t, i) => setTimeout(() => setMsgs(m => m.map(x => x.id === id + 1 ? { ...x, trace: [...x.trace, t] } : x)), 280 * (i + 1)));
    setTimeout(() => { setMsgs(m => m.map(x => x.id === id + 1 ? { ...x, text: res.text, spec: res.spec, done: true } : x)); setBusy(false); }, 280 * (res.trace.length + 1) + 150);
  };
  return (
    <aside className={`copilot ${state.copilotOpen ? 'open' : ''}`} aria-label="Procurement copilot">
      <header>
        <div><b>Copilot</b><small>Reads your draft package and the map filters</small></div>
        <button className="icon-btn only-narrow" onClick={() => dispatch({ type: 'copilot', value: false })} aria-label="Close copilot">✕</button>
      </header>
      <div className="thread" role="log" aria-live="polite">
        {!msgs.length && <div className="empty"><p>Ask about the package in the left rail. Every recommendation cites a passage or a model output, or it is withheld.</p></div>}
        {msgs.map(m => m.role === 'user' ? <div key={m.id} className="bubble user">{m.text}</div> : (
          <div key={m.id} className="agent">
            {!!m.trace.length && <details className="trace" open={!m.done}><summary>{m.done ? `Used ${m.trace.length} tools` : 'Working…'}</summary>
              {m.trace.map((t, i) => <div key={i} className="step"><code>{t.tool}</code><span>{t.args}</span><em>{t.out}</em></div>)}</details>}
            {m.done && <>
              <p className="lead">{m.text}</p>
              <Render spec={m.spec} />
              {!!m.spec.length && <button className="linkish" onClick={() => setShowSpec(s => ({ ...s, [m.id]: !s[m.id] }))}>{showSpec[m.id] ? 'Hide' : 'View'} UI spec the agent returned</button>}
              {showSpec[m.id] && <pre className="spec">{JSON.stringify(m.spec, null, 1)}</pre>}
            </>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="composer">
        <div className="sugg">{SUGGESTIONS[state.stage].map(s => <button key={s} onClick={() => ask(s)} disabled={busy}>{s}</button>)}</div>
        <form onSubmit={e => { e.preventDefault(); ask(q); }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about schedule, risk, specs, conflicts…" aria-label="Ask the copilot" />
          <button className="btn primary" disabled={busy || !q.trim()}>Ask</button>
        </form>
      </div>
    </aside>
  );
}
