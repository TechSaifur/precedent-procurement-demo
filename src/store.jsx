import { createContext, useContext, useMemo, useReducer } from 'react';
import { buildDataset, extendDataset } from './data/generate';
import { BY_ISO } from './data/countries';
import { trainModels } from './model/logistic';
import { retrieve } from './model/retrieve';
import { km, cohortFor, quantile } from './model/km';

const BASE = buildDataset();
const EXT = extendDataset(BASE);
const MODELS = { base: trainModels(BASE.contracts), ext: trainModels(EXT.contracts) };
export const DATASETS = { base: BASE, ext: EXT };

const initial = {
  view: 'map', stage: 'plan', railOpen: false, copilotOpen: false,
  draft: { desc: 'Solar PV with battery storage for rural trading-centre mini-grids', iso: 'MWI', sector: 'Energy', cat: 'Works', method: 'ICB', valueM: 14, cx: 4 },
  filters: { cats: ['Works', 'Goods', 'Consultancies', 'Non-consulting'], yearMin: 2012, yearMax: 2025, riskMin: 0 },
  layers: { points: true, arcs: true, gov: true }, colorBy: 'risk',
  selected: null, highlight: [], focus: null, source: null, batch: 0, graphProject: null, trustTab: 'conflicts', about: false,
};

function reducer(s, a) {
  switch (a.type) {
    case 'draft': return { ...s, draft: { ...s.draft, ...a.patch } };
    case 'view': return { ...s, view: a.view, copilotOpen: a.keepCopilot ? s.copilotOpen : false };
    case 'stage': return { ...s, stage: a.stage };
    case 'filters': return { ...s, filters: { ...s.filters, ...a.patch } };
    case 'layer': return { ...s, layers: { ...s.layers, [a.key]: !s.layers[a.key] } };
    case 'colorBy': return { ...s, colorBy: a.value };
    case 'select': return { ...s, selected: a.id };
    case 'highlight': return { ...s, highlight: a.ids, view: 'map', copilotOpen: false, layers: { ...s.layers, arcs: true } };
    case 'focus': return { ...s, focus: { iso: a.iso, t: Date.now() }, view: a.keepView ? s.view : 'map', copilotOpen: a.keepView ? s.copilotOpen : false };
    case 'source': return { ...s, source: a.id };
    case 'graphProject': return { ...s, graphProject: a.id, view: 'graph', copilotOpen: false, source: null };
    case 'trustTab': return { ...s, trustTab: a.tab };
    case 'batch': return { ...s, batch: a.value, filters: { ...s.filters, yearMax: a.value ? 2026 : 2025 } };
    case 'about': return { ...s, about: a.value ?? !s.about };
    case 'rail': return { ...s, railOpen: a.value ?? !s.railOpen };
    case 'copilot': return { ...s, copilotOpen: a.value ?? !s.copilotOpen };
    default: return s;
  }
}

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const data = state.batch ? EXT : BASE;
  const models = MODELS;
  const model = state.batch ? MODELS.ext : MODELS.base;
  const country = BY_ISO[state.draft.iso];
  const draftC = useMemo(() => ({ ...state.draft, gov: country.gov, region: country.region, method: state.draft.method }), [state.draft, country]);
  const precedents = useMemo(() => retrieve(state.draft, country, data, 6), [state.draft, country, data]);
  const cohort = useMemo(() => cohortFor(state.draft, country, data.contracts), [state.draft, country, data]);
  const curve = useMemo(() => km(cohort.rows.map(c => ({ t: c.tenderDays, e: c.event }))), [cohort]);
  const summary = useMemo(() => ({ median: quantile(curve, .5), p80: quantile(curve, .8) }), [curve]);
  const value = useMemo(() => ({ state, dispatch, data, model, models, country, draftC, precedents, cohort, curve, summary }), [state, data, model, country, draftC, precedents, cohort, curve, summary]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
