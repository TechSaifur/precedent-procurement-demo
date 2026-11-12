import { useApp } from '../store';
import { THEMES } from '../data/themes';
import { BY_ISO } from '../data/countries';

export default function SourceDrawer() {
  const { state, dispatch, data } = useApp();
  const l = state.source && data.lessonById[state.source]; if (!l) return null;
  const c = data.contracts.find(x => x.projectId === l.projectId), close = () => dispatch({ type: 'source', id: null });
  return (
    <div className="drawer" role="dialog" aria-label="Source passage" onKeyDown={e => e.key === 'Escape' && close()}>
      <header><div><small>Implementation Completion and Results Report</small><b>{l.projectId} · p.{l.page}</b></div><button className="icon-btn" onClick={close} aria-label="Close source" autoFocus>✕</button></header>
      <blockquote>{l.text}</blockquote>
      <dl>
        <dt>Section</dt><dd>{l.section}</dd>
        <dt>Theme</dt><dd>{THEMES[l.themeId].label}</dd>
        <dt>Project</dt><dd>{c.sector} · {BY_ISO[c.iso].name} · {c.year}</dd>
        <dt>Chunk</dt><dd>#{l.chunk} (layout-aware, section-bounded)</dd>
      </dl>
      <div className="row">
        <button className="btn" onClick={() => dispatch({ type: 'graphProject', id: l.projectId })}>Open in knowledge graph</button>
        <button className="btn" disabled title="Demo corpus is synthetic, so there is no PDF behind this passage">View PDF page</button>
      </div>
      <p className="muted small">Synthetic passage written for this demo. In production this card links to the exact page of the source PDF.</p>
    </div>
  );
}
