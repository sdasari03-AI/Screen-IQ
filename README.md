# ScreenIQ

**AI-powered background screening platform** — built as a portfolio artifact demonstrating Staff PM-level product thinking for Checkr (Senior PM, Verifications) and RealPage (Director of AI Agent Solution Consulting).

> Every feature, metric, and architectural decision in this codebase traces back to a specific product hypothesis. The [Architecture + Design Rationale page](https://screeniq.replit.app/architecture) documents the reasoning behind all of it.

---

## Live Demo

🔗 **[screeniq.replit.app](https://screeniq.replit.app)**

| Page | Path | Description |
|---|---|---|
| Dashboard | `/dashboard` | Command Center — pipeline metrics, backlog health, activity feed |
| Candidates | `/candidates` | Applicant pipeline with screening type filter |
| Candidate Detail | `/candidates/:id` | Check results, AI risk assessment, adverse action initiation |
| Adverse Action | `/adverse-action` | FCRA two-step compliance workflow |
| Compliance | `/compliance` | Dispute/adverse action metrics + AI insights |
| Analytics | `/analytics` | Checkr OKR view — attach rate, conversion, RPR, time to value |
| Benchmarks | `/analytics/benchmarks` | Industry benchmark comparison by check type |
| Tenant Screening | `/tenant` | Resident applicant workflow (credit + eviction package) |
| WBR Report | `/reports/wbr` | AI-generated Weekly Business Review |
| Architecture | `/architecture` | Staff PM design rationale, feature traceability matrix, demo script |
| Candidate Portal | `/portal` | Tokenized candidate-facing results + dispute submission |

---

## What It Demonstrates

### For Checkr — Senior PM, Verifications

- **FCRA compliance as a state machine** — pre-adverse → waiting period → final adverse, with the final notice button physically disabled until the period elapses. Compliance is structural, not procedural.
- **Seller-facing OKR fluency** — Attach Rate, Conversion Rate, Re-Run Rate (RPR), and Time to Value surfaced as first-class product metrics.
- **Friction score by check type** — the metric Checkr's product teams use to identify which check creates the most re-runs, delays, and disputes.
- **Industry benchmark comparison** — mirrors Checkr's benchmarking data product, showing screening posture relative to industry peers.
- **Portal engagement as an OKR** — tokenized candidate portal removes account-creation friction; engagement rate surfaces in the analytics dashboard.
- **AI risk assessment with confidence scores** — GPT-4o receives per-check confidence scores (not just pass/fail) and returns structured risk ratings, narratives, and recommendations.

### For RealPage — Director of AI Agent Solution Consulting

- **Tenant screening vertical** — dedicated operator workflow with credit + eviction check package, unit-centric position labels, and a filtered resident applicant list.
- **On-demand WBR generation** — AI ingests live DB metrics and produces a structured executive narrative (performance summary, risks, recommendations) in one click.
- **Backlog health as an ops surface** — overdue count, on-time delivery rate, average case age, and escalation count — the metrics an implementation ops director monitors across client deployments.
- **AI that compresses expertise** — risk assessment narratives make a non-expert case manager's review as good as an expert's in 10 seconds.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 7 |
| Data sync | TanStack Query v5 (stale-while-revalidate) |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Routing | Wouter |
| API contract | OpenAPI 3.1 spec → Orval 8.21 codegen |
| Generated code | React Query hooks + Zod v3 validators (auto-generated) |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL — raw SQL via psycopg2 |
| AI | OpenAI GPT-4o — structured JSON output mode |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser Client — React 18 + Vite 7                 │
│  TanStack Query · shadcn/ui · Recharts · Wouter     │
└──────────────────────┬──────────────────────────────┘
                       │  Generated React Query hooks
                       │  (Orval → openapi.yaml)
┌──────────────────────▼──────────────────────────────┐
│  OpenAPI Contract Layer                              │
│  openapi.yaml → hooks + Zod types (build step)      │
└──────────────────────┬──────────────────────────────┘
                       │  REST / JSON
┌──────────────────────▼──────────────────────────────┐
│  FastAPI — Python 3.12                               │
│  11 routers · simulation engine · FCRA state machine│
└──────────┬───────────────────────────────┬──────────┘
           │ psycopg2 (raw SQL)            │ OpenAI API
┌──────────▼──────────┐     ┌─────────────▼──────────┐
│  PostgreSQL          │     │  GPT-4o                 │
│  8 tables            │     │  structured JSON output  │
│  ACID transactions   │     │  4 integrations          │
└─────────────────────┘     └────────────────────────-┘
```

**Hard constraints baked into the design:**
- No API key in the browser bundle (all AI calls via server-side proxy)
- SSN last-4 only — minimal PII surface area
- ACID transactions for all state mutations
- `openapi.yaml` is the single source of truth — no hand-written API clients
- All AI prompts receive live DB metrics as context — no hallucinated data

---

## Database Schema

| Table | Purpose |
|---|---|
| `candidates` | Profiles — name, DOB, SSN last-4, status, portal token, `screening_type` |
| `screening_runs` | Each background check package run per candidate |
| `check_results` | Individual check outcomes with status, confidence score, turnaround time |
| `risk_assessments` | AI-generated risk rating, narrative, key findings, recommendations |
| `adverse_actions` | FCRA state machine — pre_adverse → adverse, reason codes, timestamps |
| `notices` | Pre-adverse and final adverse letter content |
| `disputes` | Candidate-submitted disputes per screening run |
| `wbr_reports` | Cached AI WBR narratives with embedded live metrics |

---

## AI Integrations (GPT-4o)

| Feature | Input | Output |
|---|---|---|
| **Risk Assessment** | Candidate profile + all check results with confidence scores | Structured JSON: risk level, narrative, key findings, recommendations |
| **Adverse Action Notices** | Candidate profile + flagged checks + reason codes | FCRA-compliant pre-adverse and final adverse letters |
| **Compliance Insights** | Live dispute/adverse action rate metrics | Trend analysis + actionable recommendations |
| **WBR Narrative** | Live DB metrics (pipeline, turnaround, backlog, disputes) | Full executive Weekly Business Review with risks + recommendations |

All AI responses use **structured JSON output mode** — no free-form text. Responses are machine-readable, stored in queryable DB columns, and displayable in structured UI cards.

---

## PM Design Principles

Three principles shaped every decision — each with a direct, traceable effect on at least one architectural or feature choice:

**I — Compliance is structural, not procedural**
State machines block invalid transitions. Waiting periods disable buttons. Notice sequences cannot be reordered. The right action is the only action.
*Traces to: FCRA adverse action state machine, server-side package selection by screening type.*

**II — AI compresses expertise, not decisions**
The AI makes a non-expert's review as good as an expert's — it does not adjudicate. Every consequential decision requires a deliberate human action.
*Traces to: risk assessment narrative card, WBR generation, compliance insights.*

**III — Metrics are a product surface, not an afterthought**
The analytics model was designed before the features. Each metric maps to a specific OKR or JD signal.
*Traces to: /analytics (Checkr OKR view), /analytics/benchmarks, Backlog Health widget, portal engagement rate.*

---

## Screening Packages

| Check Type | Employment | Tenant |
|---|:---:|:---:|
| Criminal background | ✓ | ✓ |
| Employment verification | ✓ | — |
| Education verification | ✓ | — |
| Driving record | ✓ | — |
| Drug / health screening | ✓ | — |
| Credit report | — | ✓ |
| Eviction history | — | ✓ |

Packages are **server-side configuration** — the UI cannot override them. Running a credit check on a job applicant (FCRA violation) is structurally impossible.

---

## Running Locally

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.12+
- PostgreSQL

### Install and run

```bash
# Install frontend dependencies
pnpm install

# Run codegen (generates React Query hooks + Zod types from OpenAPI spec)
pnpm --filter @workspace/api-spec run codegen

# Start the frontend
pnpm --filter @workspace/screeniq run dev

# Install backend dependencies
pip install -r artifacts/screeniq-api/requirements.txt

# Start the backend (set DATABASE_URL and AI env vars first)
uvicorn main:app --host 0.0.0.0 --port 8080 --reload \
  --app-dir artifacts/screeniq-api
```

### Environment variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/screeniq
AI_INTEGRATIONS_OPENAI_API_KEY=your_key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
SESSION_SECRET=your_session_secret
```

---

## Codegen Workflow

The OpenAPI spec at `lib/api-spec/openapi.yaml` is the single source of truth. After any API change:

```bash
pnpm --filter @workspace/api-spec run codegen
# Apply the Zod compatibility fix:
sed -i 's/zod\.looseObject/zod.object/g' lib/api-zod/src/generated/api.ts
```

This regenerates all hooks, types, and validators. Type drift between frontend and backend is structurally impossible — any mismatch is a build error, not a runtime bug.

---

## Project Structure

```
.
├── artifacts/
│   ├── screeniq/                  # React + Vite frontend
│   │   └── src/
│   │       ├── pages/             # 12 page components
│   │       ├── components/        # Layout, sidebar, shadcn/ui
│   │       └── App.tsx            # Routing
│   └── screeniq-api/              # FastAPI backend
│       ├── main.py                # App entry point + DB seeding
│       ├── database.py            # Schema + connection pool
│       ├── simulation.py          # Probabilistic check engine
│       ├── ai_service.py          # GPT-4o integrations
│       └── routers/               # 11 API routers
├── lib/
│   ├── api-spec/                  # openapi.yaml (source of truth)
│   ├── api-zod/                   # Generated Zod validators
│   └── api-client-react/          # Generated React Query hooks
└── README.md
```

---

## Architecture + Design Rationale

The `/architecture` page documents every decision in the codebase from a Staff PM perspective:

- **Section 00** — Three PM design principles with traceability to specific features
- **Section 01** — 5-layer architecture diagram with PM rationale per layer (clickable)
- **Section 02** — 8-step screening lifecycle with design decision per step (clickable)
- **Section 03** — Feature traceability matrix: 9 features × Checkr JD signal × RealPage JD signal × PM hypothesis
- **Section 04** — 6 technology stack decisions with PM rationale and alternative rejected
- **Section 05** — 7-step demo script with talking points and "point at" highlights

---

## Author

Built by **Sai Dasari** — portfolio project demonstrating AI-native product thinking at the Staff / Principal PM level.

- Target role 1: **Checkr — Senior PM, Verifications**
- Target role 2: **RealPage — Director of AI Agent Solution Consulting**
