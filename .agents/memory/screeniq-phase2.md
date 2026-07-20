---
name: ScreenIQ Phase 2 & 3 (Extensions)
description: What was built in the second and third major feature pushes; seeding caveats and router patterns.
---

## Phase 2 (analytics/reports/tenant pages)
- `/analytics` — Checkr OKR metrics (attach rate, conversion, RPR, time to value)
- `/analytics/benchmarks` — industry benchmark comparison
- `/reports/wbr` — AI WBR generation (GPT-4o)
- `/tenant` — tenant screening vertical
- `/architecture` — Staff PM rationale page

## Phase 3 (6-Extension Build)

### Extension 1 — AI Intelligence Panel (`routers/ai_intelligence.py`)
- 5 POST/GET endpoints: `/api/intelligence/classify-charge`, `/api/intelligence/explain-charge`, `/api/intelligence/name-matcher/{id}`, `/api/intelligence/role-matcher/{id}`, `/api/intelligence/doc-inspector`
- Doc Inspector uses `gpt-4o` (vision) with fallback; all others use `gpt-5.6-luna`
- Frontend: `AIIntelligencePanel` component embedded in candidates/detail.tsx as a third tab
- Uses direct `fetch` calls (not codegen hooks) since these are interactive, not query-keyed

### Extension 2 — Orchestration
- Routing logic lives in simulation engine details field (no DB schema change)
- Not a separate page — routing metadata surfaced via check_results.details

### Extension 3 — Report ETA
- ETA computed dynamically from check statuses (no DB schema change needed)

### Extension 4 — Continuous Monitoring (`routers/monitoring.py`, `pages/monitoring.tsx`)
- Two new tables: `monitoring_enrollments` (UNIQUE on candidate_id), `monitoring_alerts`
- GET /monitoring, POST /monitoring/enroll/{id}, GET /monitoring/alerts, GET /monitoring/stats
- POST /monitoring/alerts/{id}/dismiss

### Extension 5 — Drug Testing (`routers/drug_testing.py`, `pages/drug-testing.tsx`)
- New table: `drug_tests`
- 5 test types: 5_panel_urine, 10_panel_urine, dot_5_panel, hair_follicle, oral_fluid
- DOT-regulated tests require MRO review for non-negative results
- POST /drug-tests/order (simulates result deterministically from candidateId+testType+date seed)
- POST /drug-tests/{id}/mro-complete

### Extension 6 — MCP Server (`routers/mcp_server.py`, `pages/mcp-docs.tsx`)
- JSON-RPC 2.0 over HTTP at `/api/mcp`
- 6 tools: list_candidates, get_candidate, get_report, get_analytics, get_alerts, get_my_report
- SSE GET endpoint at same path
- Frontend MCP docs page shows tools, prompts, setup configs for Claude Desktop/Cursor/VS Code

## Seeding Pattern
- `_seed_demo_data()` in main.py returns early if `COUNT(*) FROM candidates > 0`
- `_seed_extension_data()` returns early if `COUNT(*) FROM monitoring_enrollments > 0`
- Extension seed adds: 4 new candidates (Tyler Brooks, Keisha Monroe, Maria Gonzalez-Santos, James Whitfield), 3 drug tests, 5 monitoring enrollments, 2 monitoring alerts

## Sidebar Tagline
Updated to: `"AI-Native Verification Intelligence / FCRA · DOT · MCP-Ready"`
