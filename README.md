# Precedent: procurement intelligence demo

A React front end for the "AI-Powered Procurement Intelligence Platform" assessment.
Map-first mission control with an agent copilot, a knowledge graph, a risk lab, and a trust and learning view.

**All data is synthetic**, shaped like World Bank schemas (contract awards, projects, ICR/ISR documents, governance indicators). Nothing here is a real finding.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # single-file build in dist/index.html
npm run test:e2e   # Playwright (run `npx playwright install` first; tests are not yet run in CI)
```

## Structure
```
src/
  data/        synthetic cohort generator, countries, lesson themes
  model/       logistic models, Kaplan–Meier, hybrid retrieval (RRF), graph + conflict resolution
  agent/       scripted planner → tool trace → declarative UI spec → grounding validator
  components/  A2UI registry, copilot, draft rail, source drawer, About
  views/       MapView, GraphView, RiskLab, TrustView
tests/         Playwright specs
```

## What is real and what is stand-in
| Piece | In this demo | In production |
| --- | --- | --- |
| Map | d3-geo SVG with Kepler-style layers, filters, time playback | kepler.gl / deck.gl on a Mapbox basemap |
| Copilot | Scripted agent, same output contract | CopilotKit + LLM, `useCopilotReadable` / `useCopilotAction` |
| UI from agent | JSON spec rendered by a component registry (A2UI-style) | A2UI renderer |
| Retrieval | Structured similarity + TF-IDF fused with RRF | BM25 + dense embeddings + cross-encoder rerank |
| Risk model | Logistic regression trained in the browser, temporal hold-out AUC | Calibrated GBT + Cox/AFT survival |
| Survival | Kaplan–Meier with censoring and Greenwood band (real computation) | same, with covariates |
| Guardrail | Claim → passage ID + theme check; unsupported claims withheld | + entailment model, span-level verification |

## Bit.dev
Components in `src/components` and the map layer panel are written to be exportable: each takes its data from the store hook only, so wrapping with `bit init` and `bit add` is mechanical.
