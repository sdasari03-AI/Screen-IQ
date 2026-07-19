# ScreenIQ

A full-stack background screening platform I built to deeply understand how identity verification, compliance automation, and AI-assisted decision-making can work together in a regulated industry.

Background screening is one of those domains that looks straightforward from the outside — run some checks, get a report — but is genuinely complex the moment you engage with it seriously. FCRA has real teeth. The adverse action process has specific legal sequencing that companies get wrong constantly. The candidate experience is almost universally terrible. And the analytics layer is almost always an afterthought bolted on after the fact. I wanted to build something that treated all of these as first-class product problems, not checkbox features.

---

## Why I Built This

I got interested in background screening after reading through a number of FCRA class-action settlements and noticing a pattern: most violations weren't caused by companies ignoring the law — they were caused by systems that gave operators the *option* to comply, rather than making compliance the only path. A pre-adverse notice sent a day too early, a final adverse letter issued before the dispute window closed, a credit check run on a job applicant because a dropdown was misconfigured. These are software failures dressed up as human errors.

That observation became the design thesis for the whole platform: **compliance should be structural, not procedural.** The system should make it physically impossible to do the wrong thing, not just remind you that the right thing exists.

From there the project grew into something I'm genuinely proud of — a full screening lifecycle, probabilistic check simulation, an AI layer that I think is actually useful (not just impressive), and an analytics model that tries to answer the questions an operator would actually ask.

---

## What It Does

ScreenIQ covers the full background screening lifecycle — from the moment a candidate record is created to the moment a dispute is resolved and the case is closed.

**Candidate pipeline.** Two screening verticals with different check packages: employment (criminal, employment verification, education, driving record, drug/health) and tenant/resident (criminal, credit, eviction). The check package is determined server-side based on screening type — you can't accidentally run a credit check on a job applicant.

**Probabilistic simulation engine.** Rather than hardcoding pass/fail outcomes, the simulation engine generates realistic results with per-check confidence scores, turnaround latency, and status vocabulary that mirrors what live checks actually return. This means every screening run tells a different story, and the AI layer always has something meaningful to work with.

**AI Risk Assessment.** After checks complete, GPT-4o receives the full result set including confidence scores — not just statuses — and returns a structured assessment: overall risk level, plain-English narrative, key findings, and recommendations. Confidence scores matter here: a criminal flag at 40% confidence is a very different signal from one at 97%, and the system surfaces that distinction explicitly.

**FCRA Adverse Action workflow.** The part I'm most pleased with. A state machine enforces the legal sequence: pre-adverse notice → mandatory waiting period → final adverse notice. The final notice button is disabled until the period elapses. There is no override. The AI generates both letters with correct reason codes and candidate rights language, but the system controls the sequencing — not the operator.

**Candidate Portal.** Tokenized, no account creation required. Candidates get a link, see their results in plain language, and can submit disputes. Removing account creation was a deliberate friction-reduction decision — it's the highest-dropout step in any consumer flow, and there's no functional reason to require it for a read-mostly view.

**Analytics layer.** Attach rate, conversion rate, re-run rate, time to value, friction score by check type, backlog health, industry benchmark comparison. Designed as a product surface that an operator would actually use to run their business, not a dashboard that exists to look impressive in a demo.

**Weekly Business Review (WBR) generation.** The AI ingests live database metrics — pipeline health, turnaround averages, backlog aging, dispute trends — and produces a structured executive narrative with a performance summary, operational health assessment, risks, and recommendations. Useful for any team that has to turn operational data into a coherent story on a regular cadence.

---

## Technical Decisions Worth Noting

**OpenAPI-first codegen.** The `openapi.yaml` spec is the single source of truth. Orval generates all React Query hooks, Zod validators, and TypeScript types automatically. No hand-written API clients — type drift between frontend and backend is a build error, not a runtime surprise discovered three weeks later.

**Python backend.** The API and intelligence layers share a runtime. Adding a new AI capability — a new prompt, a new structured output, a scoring model — requires no new service and no new deployment. The AI ecosystem is in Python; the backend should be too.

**Raw SQL over ORM.** For compliance-critical queries that join across candidates, screening runs, check results, adverse actions, and notices, I wanted SQL that was explicit and auditable. ORM-generated queries for that join surface are hard to reason about and harder to explain to a compliance team.

**Structured JSON output mode for all AI calls.** Every GPT-4o response in this codebase uses `response_format: json_object`. Free-form text responses can't be parsed into displayable card fields, stored in queryable columns, or compared across candidates over time. Structured output enforces the API contract at the model level — the LLM itself rejects malformed responses.

**Minimal PII.** SSN last-4 only, never full SSN. The portal uses token-based access — no passwords, no credential management, no breach exposure for a read-mostly surface.

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
| AI | OpenAI GPT-4o, structured JSON output |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Browser — React 18 + Vite                           │
│  TanStack Query · shadcn/ui · Recharts               │
└─────────────────────┬────────────────────────────────┘
                      │  Generated hooks (Orval → openapi.yaml)
┌─────────────────────▼────────────────────────────────┐
│  OpenAPI Contract Layer                               │
│  openapi.yaml → React Query hooks + Zod types        │
└─────────────────────┬────────────────────────────────┘
                      │  REST / JSON
┌─────────────────────▼────────────────────────────────┐
│  FastAPI — Python 3.12                                │
│  11 routers · simulation engine · FCRA state machine │
└──────────┬──────────────────────────┬────────────────┘
           │ psycopg2                 │ OpenAI
┌──────────▼─────────┐   ┌───────────▼────────────────┐
│  PostgreSQL         │   │  GPT-4o                     │
│  8 tables           │   │  structured JSON output     │
│  ACID transactions  │   │  4 integrations             │
└────────────────────┘   └────────────────────────────┘
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `candidates` | Profiles — screening type, status, tokenized portal link |
| `screening_runs` | Each check package run per candidate |
| `check_results` | Per-check outcomes, confidence scores, turnaround time |
| `risk_assessments` | AI-generated risk level, narrative, key findings |
| `adverse_actions` | FCRA state machine — pre_adverse → adverse |
| `notices` | Pre-adverse and final adverse letter content |
| `disputes` | Candidate-submitted disputes per run |
| `wbr_reports` | Cached AI WBR narratives with embedded metrics |

---

## AI Integrations

| Feature | What goes in | What comes out |
|---|---|---|
| Risk Assessment | Candidate profile + check results + confidence scores | Risk level, narrative, key findings, recommendations |
| Adverse Action Notices | Flagged checks + reason codes | FCRA-compliant pre-adverse and final adverse letters |
| Compliance Insights | Live dispute and adverse action rate metrics | Trend analysis and recommendations |
| WBR Narrative | Live DB metrics (pipeline, turnaround, backlog, disputes) | Executive weekly review with risks and recommendations |

---

## Screening Packages

| Check | Employment | Tenant |
|---|:---:|:---:|
| Criminal background | ✓ | ✓ |
| Employment verification | ✓ | — |
| Education verification | ✓ | — |
| Driving record | ✓ | — |
| Drug / health screening | ✓ | — |
| Credit report | — | ✓ |
| Eviction history | — | ✓ |

---

## Running Locally

**Prerequisites:** Node.js 18+, pnpm, Python 3.12+, PostgreSQL

```bash
# Frontend
pnpm install
pnpm --filter @workspace/api-spec run codegen
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
│   │       ├── pages/             # 12 page components
│   │       ├── components/        # Layout, sidebar, shadcn/ui
│   │       └── App.tsx
│   └── screeniq-api/              # FastAPI backend
│       ├── main.py                # Entry point + DB seeding
│       ├── database.py            # Schema + connection pool
│       ├── simulation.py          # Probabilistic check engine
│       ├── ai_service.py          # GPT-4o integrations
│       └── routers/               # 11 API routers
├── lib/
│   ├── api-spec/                  # openapi.yaml — single source of truth
│   ├── api-zod/                   # Generated Zod validators
│   └── api-client-react/          # Generated React Query hooks
└── README.md
```

---

## What I'd Build Next

A few directions I'm actively thinking about:

- **Webhook delivery** — push notifications to employer ATS systems when checks complete, instead of requiring polling. This is how any serious integration works in practice.
- **ML-based fraud signal detection** — flag synthetic identity patterns before the check even runs. The confidence score infrastructure is already there; scoring models would plug in naturally.
- **Configurable check packages per account** — right now packages are global config. Real operators need per-position or per-location overrides with audit trails.
- **Dispute resolution analytics** — tracking which check types generate the most successful disputes would feed back into the simulation engine's accuracy over time.
- **Multi-tenant architecture** — isolating candidate data and configuration per employer account, which is table stakes for any real deployment of this kind of platform.

---

## Live Demo

🔗 **[screeniq.replit.app](https://screeniq.replit.app)**

The `/architecture` page documents the reasoning behind every structural decision in the product — worth reading if you want to understand the thinking, not just the output.

---

*Built by Srinivas Dasari*
