# ScreenIQ

A full-stack background screening platform I built to deeply understand how identity verification, compliance automation, and AI-assisted decision-making can work together in a regulated industry.

Background screening is one of those domains that looks straightforward from the outside — run some checks, get a report — but is genuinely complex the moment you engage with it seriously. FCRA has real teeth. DOT drug testing has MRO review requirements that can't be skipped. The adverse action process has specific legal sequencing that companies get wrong constantly. The candidate experience is almost universally terrible. And the analytics layer is almost always an afterthought bolted on after the fact. I wanted to build something that treated all of these as first-class product problems, not checkbox features.

---

## Why I Built This

I got interested in background screening after reading through a number of FCRA class-action settlements and noticing a pattern: most violations weren't caused by companies ignoring the law — they were caused by systems that gave operators the *option* to comply, rather than making compliance the only path. A pre-adverse notice sent a day too early, a final adverse letter issued before the dispute window closed, a credit check run on a job applicant because a dropdown was misconfigured. These are software failures dressed up as human errors.

That observation became the design thesis for the whole platform: **compliance should be structural, not procedural.** The system should make it physically impossible to do the wrong thing, not just remind you that the right thing exists. That same principle extends to DOT drug testing (MRO review enforced at the data layer), continuous monitoring (post-hire alerts with inline adverse action triggers), and the MCP integration layer (candidate tool is portal-token gated — a client can't query someone else's report).

---

## What It Does

ScreenIQ covers the full background screening lifecycle — from the moment a candidate record is created through post-hire monitoring, drug testing, and AI agent access via MCP.

**Candidate pipeline.** Two screening verticals with different check packages: employment (criminal, employment verification, education, driving record) and tenant/resident (criminal, credit, eviction). The check package is determined server-side based on screening type — you can't accidentally run a credit check on a job applicant.

**Probabilistic simulation engine.** Rather than hardcoding pass/fail outcomes, the simulation engine generates realistic results with per-check confidence scores, turnaround latency, and status vocabulary that mirrors what live checks actually return. Every screening run tells a different story, and the AI layer always has something meaningful to work with.

**Intelligent Orchestration.** When a screening run starts, the engine selects the fastest verification path per check type — large employer → automated HR query, small business → manual queue, self-employed → tax document path. Routing decision, estimated turnaround, and reason are surfaced per check so operators can see *why* something is taking longer, not just that it is.

**AI Intelligence Panel.** Five GPT-4o sub-panels on every candidate detail page:
- *Charge Classifier* — paste any raw criminal charge string, pick an employer ruleset (standard / felonies only / ignore traffic), get category, severity, disposition, and a flag/review/clear decision with rationale
- *Charge Explainer* — one click from the classifier result, returns EEOC fair-hiring context, typical sentence range, relevant statute, and how common this charge is nationally
- *Name Matcher* — generates alias variants (maiden name, spelling variants, cultural naming patterns, hyphenated combinations) for broader database coverage, with confidence scores per variant
- *Role Matcher* — compares claimed job title and employer against the employment verification record; returns Confirmed / Discrepancy / Fabrication with mismatch detail
- *Doc Inspector* — upload a pay stub, bank statement, or offer letter; GPT-4o Vision scans for font inconsistencies, alignment issues, altered fields, and metadata mismatches

**AI Risk Assessment.** After checks complete, GPT-4o receives the full result set including confidence scores — not just statuses — and returns a structured assessment: overall risk level, plain-English narrative, key findings, and recommendations. Confidence scores matter here: a criminal flag at 40% confidence is a very different signal from one at 97%.

**FCRA Adverse Action workflow.** A state machine enforces the legal sequence: pre-adverse notice → mandatory waiting period → final adverse notice. The final notice button is disabled until the period elapses. There is no override. The AI generates both letters with correct reason codes and candidate rights language, but the system controls the sequencing.

**Report ETA.** Per-check progress with estimated completion date/time, recalculated dynamically as checks complete. Surfaced in both the operator view and the candidate portal.

**Candidate Portal.** Tokenized, no account creation required. Candidates get a link, see their results in plain language, check ETAs, and can submit disputes. Removing account creation was a deliberate friction-reduction decision — it's the highest-dropout step in any consumer flow.

**Continuous Monitoring.** Post-hire surveillance for enrolled employees. Monitors new criminal filings, driving record changes, sanctions/watchlist additions, and license status changes. Alerts are severity-tiered — Critical (Initiate Adverse Action), Warning (Review), Info (Acknowledge) — with dismiss workflow and inline adverse action trigger directly on the alert card.

**Drug Testing Module.** Five test types: 5-Panel Urine, 10-Panel Urine, DOT 5-Panel, Hair Follicle, Oral Fluid. Full workflow: order → collection site locator → lab simulation → result. DOT-regulated tests with non-negative results are held in "Pending MRO Review" — the result cannot be finalized until a Medical Review Officer signs off, per 49 CFR Part 40. Chain of custody IDs generated per test.

**Analytics layer.** Attach rate, conversion rate, re-run rate, time to value, friction score by check type, backlog health, industry benchmark comparison. Designed as a product surface an operator would actually use to run their business, not a dashboard that exists to look impressive in a demo.

**Weekly Business Review (WBR) generation.** The AI ingests live database metrics and produces a structured executive narrative with performance summary, operational health assessment, risks, and recommendations.

**MCP Server.** A fully spec-compliant Model Context Protocol server (JSON-RPC 2.0 over Streamable HTTP) at `/api/mcp`. Connect Claude Desktop, Cursor, or VS Code Copilot and query candidates, reports, analytics, and monitoring alerts in natural language — without opening a browser. Six tools: `list_candidates`, `get_candidate`, `get_report`, `get_analytics`, `get_alerts`, `get_my_report` (portal-token gated for candidates). Setup configs for all three clients are documented at `/mcp-docs`.

---

## Technical Decisions Worth Noting

**OpenAPI-first codegen.** The `openapi.yaml` spec is the single source of truth. Orval generates all React Query hooks, Zod validators, and TypeScript types automatically. No hand-written API clients — type drift between frontend and backend is a build error, not a runtime surprise. The AI Intelligence panel and MCP endpoints deliberately bypass codegen (they use direct fetch and JSON-RPC respectively) because their payloads are imperative actions, not declarative queries with cache keys. Mixing both patterns is intentional.

**Python backend.** The API, intelligence, and MCP layers share a runtime. Adding a new AI capability or a new MCP tool requires no new service and no new deployment. The AI ecosystem is in Python; the backend should be too. The MCP server is a FastAPI router — any database query is immediately available as an AI tool with zero additional infrastructure.

**Raw SQL over ORM.** For compliance-critical queries that join across candidates, screening runs, check results, adverse actions, notices, monitoring events, and drug tests, I wanted SQL that was explicit and auditable.

**Structured JSON output mode for all AI calls.** Every GPT-4o text response uses `response_format: json_object`. GPT-4o Vision (Doc Inspector) returns structured JSON too, with a free-text fallback that still structures the result. Free-form responses can't be parsed into displayable card fields, stored in queryable columns, or compared across candidates.

**Compliance is structural at the data layer.** The FCRA waiting period disables the final adverse button. The DOT MRO hold sets `status = pending_mro` — the result can only move to `resulted` via the `/mro-complete` endpoint. Neither can be talked past by a UI change or an operator shortcut.

**Minimal PII.** SSN last-4 only, never full SSN. The portal uses token-based access — no passwords, no credential management. The MCP candidate tool requires the portal token — an AI client cannot query a candidate's report without it.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 7 |
| Data sync | TanStack Query v5 |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Routing | Wouter |
| API contract | OpenAPI 3.1 → Orval 8.21 codegen |
| Generated | React Query hooks + Zod v3 validators |
| Backend | FastAPI — Python 3.12 |
| Database | PostgreSQL, raw SQL via psycopg2 |
| AI (text) | OpenAI GPT-4o, structured JSON output |
| AI (vision) | GPT-4o Vision — Doc Inspector |
| Agent protocol | MCP 2024-11-05, Streamable HTTP, JSON-RPC 2.0 |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — React 18 + Vite                                    │
│  TanStack Query · shadcn/ui · Recharts · direct fetch (AI)   │
└─────────────────────┬────────────────────────────────────────┘
                      │  Generated hooks (Orval → openapi.yaml)
┌─────────────────────▼────────────────────────────────────────┐
│  OpenAPI Contract Layer                                        │
│  openapi.yaml → React Query hooks + Zod types                 │
└─────────────────────┬────────────────────────────────────────┘
                      │  REST / JSON
┌─────────────────────▼────────────────────────────────────────┐
│  FastAPI — Python 3.12                                         │
│  15 routers · simulation engine · FCRA + DOT state machines   │
│  AI Intelligence · Continuous Monitoring · Drug Testing · MCP  │
└────────┬─────────────────────────┬───────────────────────────┘
         │ psycopg2                │ OpenAI proxy
┌────────▼────────────┐  ┌─────────▼──────────────────────────┐
│  PostgreSQL          │  │  GPT-4o (text + vision)             │
│  11 tables           │  │  structured JSON output             │
│  ACID transactions   │  │  7 AI integrations                  │
└─────────────────────┘  └────────────────────────────────────┘
         ▲
         │  JSON-RPC 2.0 / Streamable HTTP
┌────────┴────────────────────────────────────────────────────┐
│  MCP Clients — Claude Desktop · Cursor · VS Code Copilot     │
│  6 tools · operator + candidate access · portal-token gated  │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `candidates` | Profiles — screening type, status, tokenized portal link |
| `screening_runs` | Each check package run per candidate |
| `check_results` | Per-check outcomes, confidence scores, routing details, turnaround |
| `risk_assessments` | AI-generated risk level, narrative, key findings |
| `adverse_actions` | FCRA state machine — pre_adverse → adverse |
| `notices` | Pre-adverse and final adverse letter content |
| `disputes` | Candidate-submitted disputes per run |
| `wbr_reports` | Cached AI WBR narratives with embedded metrics |
| `monitoring_enrollments` | Post-hire monitoring — active/inactive, monitor type config |
| `monitoring_alerts` | Criminal / driving / sanctions / license alerts — severity tiers |
| `drug_tests` | 5 test types, DOT compliance flags, MRO review state, COC ID |

---

## AI Integrations

| Feature | What goes in | What comes out |
|---|---|---|
| Risk Assessment | Candidate profile + check results + confidence scores | Risk level, narrative, key findings, recommendations |
| Adverse Action Notices | Flagged checks + reason codes | FCRA-compliant pre-adverse and final adverse letters |
| Compliance Insights | Live dispute and adverse action rate metrics | Trend analysis and recommendations |
| WBR Narrative | Live DB metrics (pipeline, turnaround, backlog, disputes) | Executive weekly review with risks and recommendations |
| Charge Classifier | Raw charge string + employer ruleset | Category, severity, disposition, flag/review/clear + rationale |
| Charge Explainer | Charge string + classification | EEOC context, statute, sentence range, fair hiring guidance |
| Name Matcher | Candidate name + DOB | Alias variants, confidence scores, search coverage summary |
| Role Matcher | Claimed title + verification record | Confirmed / Discrepancy / Fabrication with mismatch detail |
| Doc Inspector | Uploaded pay stub / bank statement / offer letter (image) | Authenticity verdict, flags found, clean signals, recommendation |

---

## Screening Packages

| Check | Employment | Tenant |
|---|:---:|:---:|
| Criminal background | ✓ | ✓ |
| Employment verification | ✓ | — |
| Education verification | ✓ | — |
| Driving record | ✓ | — |
| Credit report | — | ✓ |
| Eviction history | — | ✓ |

---

## MCP Tools

| Tool | Access | Description |
|---|---|---|
| `list_candidates` | Operator | List all candidates with status, screening type, package |
| `get_candidate` | Operator | Full profile and check status for a candidate by ID |
| `get_report` | Operator | Complete screening results with AI risk assessment |
| `get_analytics` | Operator | Attach rate, conversion, backlog health, adverse actions open |
| `get_alerts` | Operator | Continuous monitoring alerts, filterable by severity |
| `get_my_report` | Candidate | Own report status — portal token required |

Connect at `/api/mcp` — JSON-RPC 2.0 over Streamable HTTP, MCP protocol version 2024-11-05.

---

## Running Locally

**Prerequisites:** Node.js 18+, pnpm, Python 3.12+, PostgreSQL

```bash
# Frontend
pnpm install
pnpm --filter @workspace/api-spec run codegen
sed -i 's/zod\.looseObject/zod.object/g' lib/api-zod/src/generated/api.ts
pnpm --filter @workspace/screeniq run dev

# Backend
pip install -r artifacts/screeniq-api/requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload \
  --app-dir artifacts/screeniq-api
```

**Environment variables:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/screeniq
AI_INTEGRATIONS_OPENAI_API_KEY=your_key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
SESSION_SECRET=your_session_secret
```

**After any API change — regenerate the client:**
```bash
pnpm --filter @workspace/api-spec run codegen
sed -i 's/zod\.looseObject/zod.object/g' lib/api-zod/src/generated/api.ts
```

---

## Project Structure

```
.
├── artifacts/
│   ├── screeniq/                  # React + Vite frontend
│   │   └── src/
│   │       ├── pages/             # 15 page components
│   │       │   ├── candidates/    # List + detail (with AI Intelligence tab)
│   │       │   ├── analytics/     # OKR metrics + benchmarks
│   │       │   ├── reports/       # WBR generation
│   │       │   ├── monitoring.tsx # Continuous monitoring
│   │       │   ├── drug-testing.tsx
│   │       │   ├── mcp-docs.tsx
│   │       │   └── architecture.tsx
│   │       ├── components/        # Layout, sidebar, shadcn/ui
│   │       └── App.tsx
│   └── screeniq-api/              # FastAPI backend
│       ├── main.py                # Entry point + DB seeding (two-phase)
│       ├── database.py            # Schema + connection pool
│       ├── simulation.py          # Probabilistic check engine
│       ├── ai_service.py          # GPT-4o integrations
│       └── routers/               # 15 API routers
│           ├── candidates.py
│           ├── screening.py
│           ├── risk_assessment.py
│           ├── analytics.py
│           ├── reports.py
│           ├── compliance.py
│           ├── adverse_action.py
│           ├── disputes.py
│           ├── portal.py
│           ├── dashboard.py
│           ├── ai_intelligence.py # Charge Classifier/Explainer/Name/Role/Doc
│           ├── monitoring.py      # Post-hire continuous monitoring
│           ├── drug_testing.py    # 5 test types, DOT compliance, MRO workflow
│           └── mcp_server.py      # JSON-RPC 2.0, 6 MCP tools
├── lib/
│   ├── api-spec/                  # openapi.yaml — single source of truth
│   ├── api-zod/                   # Generated Zod validators
│   └── api-client-react/          # Generated React Query hooks
└── README.md
```

---

## What I'd Build Next

A few directions worth pursuing:

- **Webhook delivery** — push notifications to employer ATS systems when checks complete, instead of requiring polling. This is how any serious integration works in practice.
- **ML-based fraud signal detection** — flag synthetic identity patterns before the check even runs. The confidence score infrastructure is already there; scoring models would plug in naturally at the simulation layer.
- **Configurable check packages per account** — right now packages are global config. Real operators need per-position or per-location overrides with full audit trails for compliance reporting.
- **Multi-tenant architecture** — isolating candidate data and config per employer account, which is table stakes for any real deployment.
- **MCP authentication** — the current MCP server is open for demo access. Production would add OAuth 2.0 bearer token validation at the `/api/mcp` endpoint, with per-tool permission scopes.
- **Dispute resolution analytics** — tracking which check types generate the most successful disputes would feed back into the simulation engine's accuracy model over time.

---

## Live Demo

🔗 **[screeniq.replit.app](https://screeniq.replit.app)**

The `/architecture` page documents the reasoning behind every structural decision — 6 architecture layers, 12 lifecycle steps, 13 features traced to JD signals with PM hypotheses, and a 10-stop demo script. Worth reading if you want to understand the thinking, not just the output.

---

*Built by Srinivas Dasari*
