import { AppProvider, useApp } from './store';
import DraftPanel from './components/DraftPanel';
import Copilot from './components/Copilot';
import SourceDrawer from './components/SourceDrawer';
import About from './components/About';
import MapView from './views/MapView';
import GraphView from './views/GraphView';
import RiskLab from './views/RiskLab';
import TrustView from './views/TrustView';

const VIEWS = [['map', 'Precedent map'], ['graph', 'Knowledge graph'], ['risk', 'Risk lab'], ['trust', 'Trust and learning']];
function Shell() {
  const { state, dispatch, country, draftC } = useApp();
  const View = { map: MapView, graph: GraphView, risk: RiskLab, trust: TrustView }[state.view];
  return (
    <div className="app">
      <header className="top">
        <div className="brand"><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="9" cy="14" r="7" fill="none" stroke="#2447D8" strokeWidth="2" /><circle cx="17" cy="12" r="7" fill="none" stroke="#14212B" strokeWidth="2" /></svg><b>Precedent</b></div>
        <nav aria-label="Views">{VIEWS.map(([k, l]) => <button key={k} className={state.view === k ? 'on' : ''} aria-current={state.view === k} onClick={() => dispatch({ type: 'view', view: k })}>{l}</button>)}</nav>
        <div className="top-r">
          <button className="btn" onClick={() => dispatch({ type: 'about' })}>About</button>
          <span className="pill" title="All records and documents in this demo are synthetic, shaped like World Bank schemas.">Synthetic data</span>
          <button className="btn only-narrow" onClick={() => dispatch({ type: 'rail' })}>Draft</button>
          <button className="btn primary only-narrow" onClick={() => dispatch({ type: 'copilot' })}>Copilot</button>
        </div>
      </header>
      <div className="draftbar"><span>{state.draft.sector} · {state.draft.cat}</span><b>{state.draft.desc}</b><span>{country.name} · ${state.draft.valueM}M</span></div>
      <div className="shell">
        <DraftPanel />
        <main><View /></main>
        <Copilot />
      </div>
      <SourceDrawer />
      <About />
    </div>
  );
}
export default function App() { return <AppProvider><Shell /></AppProvider>; }
