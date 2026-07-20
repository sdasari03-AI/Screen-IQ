import React, { useState } from "react";
import { AppLayout } from "@/components/app-layout";

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  frontend: { bg: "bg-blue-950",    border: "border-blue-700",    text: "text-blue-300",    badge: "bg-blue-900 text-blue-200" },
  codegen:  { bg: "bg-amber-950",   border: "border-amber-700",   text: "text-amber-300",   badge: "bg-amber-900 text-amber-200" },
  api:      { bg: "bg-indigo-950",  border: "border-indigo-700",  text: "text-indigo-300",  badge: "bg-indigo-900 text-indigo-200" },
  db:       { bg: "bg-emerald-950", border: "border-emerald-700", text: "text-emerald-300", badge: "bg-emerald-900 text-emerald-200" },
  ai:       { bg: "bg-violet-950",  border: "border-violet-700",  text: "text-violet-300",  badge: "bg-violet-900 text-violet-200" },
  mcp:      { bg: "bg-rose-950",    border: "border-rose-700",    text: "text-rose-300",    badge: "bg-rose-900 text-rose-200" },
};

// ─── Architecture layers ──────────────────────────────────────────────────────
const LAYERS = [
  {
    id: "frontend", num: "01", label: "Presentation Layer", title: "Browser Client",
    color: C.frontend,
    chips: [
      "React 18 + Vite 7", "TanStack Query v5", "shadcn/ui + Tailwind CSS",
      "Recharts", "Wouter (routing)", "Generated React Query hooks",
      "Zod v3 validators (codegen)", "Direct fetch (AI Intelligence panel)",
      "File upload (Doc Inspector / GPT-4o Vision)", "SSE-compatible fetch (MCP)",
    ],
    rationale: "A single-page app eliminates full-page reloads during a live screening review — case managers navigate between candidates without losing context. TanStack Query's stale-while-revalidate strategy means the dashboard automatically refreshes background check statuses without a manual polling architecture. The AI Intelligence panel deliberately uses direct fetch rather than codegen hooks — GPT-4o calls are imperative actions triggered by the operator, not declarative queries with cache keys. Mixing both patterns in the same codebase is intentional: use the right tool for the interaction model.",
  },
  {
    id: "codegen", num: "02", label: "Contract Layer", title: "OpenAPI-First Code Generation Pipeline",
    color: C.codegen,
    chips: [
      "openapi.yaml (single source of truth)", "Orval 8.21 (codegen engine)",
      "React Query hooks — generated", "Zod v3 schemas — generated",
      "TypeScript types — generated", "pnpm codegen (single command)",
      "Post-codegen sed fix: zod.looseObject → zod.object",
    ],
    rationale: "Hand-written API clients drift from the backend silently — a field is renamed on the server, the client still sends the old name, and the bug surfaces in production three weeks later. Orval generates every hook, type, and validator from the OpenAPI spec, making drift structurally impossible. This is a Staff PM-level architectural decision: invest once in the contract layer, eliminate a whole class of integration bugs forever. The MCP server and AI Intelligence endpoints bypass codegen intentionally — they use imperative fetch patterns because their payloads are dynamic, open-ended, and not cacheable as query keys.",
  },
  {
    id: "api", num: "03", label: "Application Layer", title: "FastAPI — Python 3.12",
    color: C.api,
    chips: [
      // Core
      "GET /candidates (+ ?screeningType filter)", "POST /candidates/:id/screening-runs",
      "GET /analytics/business-metrics", "GET /analytics/benchmarks",
      "GET /analytics/backlog", "GET /analytics/friction",
      "POST /adverse-action", "GET /compliance/metrics",
      "GET /reports/wbr + POST /generate", "GET /portal/:token (public)",
      "Simulation engine — 7 check types", "FCRA adverse-action state machine",
      // Extensions
      "POST /intelligence/classify-charge", "POST /intelligence/explain-charge",
      "GET /intelligence/name-matcher/:id", "GET /intelligence/role-matcher/:id",
      "POST /intelligence/doc-inspector (vision)",
      "GET /monitoring + POST /monitoring/enroll/:id",
      "GET /monitoring/alerts + POST /alerts/:id/dismiss",
      "GET /drug-tests + POST /drug-tests/order",
      "POST /drug-tests/:id/mro-complete",
      "POST /mcp (JSON-RPC 2.0)", "GET /mcp (SSE stream)",
    ],
    rationale: "Python was a product decision, not a technical one: every AI/ML library (OpenAI, LangChain, future ML scoring) is first-class in Python. The API and intelligence layers share a runtime — adding a new AI feature requires no new service, no new deployment, no cross-service API design. The MCP server is a FastAPI router, not a separate process — any new database query or AI capability is immediately available as an MCP tool with zero additional infrastructure. FastAPI auto-generates the OpenAPI spec from type annotations, keeping the contract layer always current without a separate documentation step.",
  },
  {
    id: "db", num: "04", label: "Persistence Layer", title: "PostgreSQL",
    color: C.db,
    chips: [
      "candidates (+ screening_type)", "screening_runs (employment / tenant packages)",
      "check_results (7 check types, confidence scores, routing details)",
      "adverse_actions (pre-adverse → adverse state machine)",
      "disputes (FCRA-mandated)", "wbr_reports (AI narrative cache)",
      "monitoring_enrollments (UNIQUE on candidate_id, active/inactive)",
      "monitoring_alerts (criminal / driving / sanctions / license — severity tiers)",
      "drug_tests (5 test types, DOT compliance flags, MRO review state, COC ID)",
      "ALTER TABLE IF NOT EXISTS — zero-downtime schema evolution",
    ],
    rationale: "ACID compliance is the product requirement, not the technical constraint. A background check platform that can produce a partially-written adverse action record — even transiently — is a compliance liability. PostgreSQL's transactional DDL lets us evolve the schema as new check types are added via ALTER TABLE ... ADD COLUMN IF NOT EXISTS, with zero downtime. The monitoring_enrollments table uses UNIQUE (candidate_id) with ON CONFLICT DO UPDATE — an idempotent upsert that makes enrollment safe to call multiple times without phantom records. The relational model was essential for compliance reporting queries that join across candidates, runs, checks, adverse actions, monitoring events, and drug tests.",
  },
  {
    id: "ai", num: "05", label: "Intelligence Layer", title: "OpenAI GPT-4o via Replit AI Proxy",
    color: C.ai,
    chips: [
      "Risk assessment narratives (per candidate, per run)",
      "Compliance insight generation (weekly digest)",
      "WBR executive narrative (on-demand, live DB metrics injected)",
      "Charge Classifier — category / severity / disposition / ruleset decision",
      "Charge Explainer — EEOC fair-hiring context, plain language",
      "Name Matcher — alias variants, cultural naming patterns, database coverage",
      "Role Matcher — claimed vs verified title / Confirmed / Discrepancy / Fabrication",
      "Doc Inspector — GPT-4o Vision, forgery signal detection on uploaded documents",
      "Structured JSON output mode (response_format: json_object)",
      "gpt-5.6-luna for text; gpt-4o for vision (Doc Inspector)",
    ],
    rationale: "Structured output mode was a product requirement set before a single prompt was written. A risk assessment that returns free-form text cannot be parsed into key findings, stored in queryable fields, or displayed in a structured card. JSON output mode enforces the API contract at the model level. The AI Intelligence panel (Charge Classifier, Explainer, Name Matcher, Role Matcher, Doc Inspector) demonstrates GPT-4o as a verification intelligence surface, not just a text generator — each sub-panel maps to a specific verification workflow step that a human analyst would otherwise spend 20–40 minutes on. The Replit AI Proxy handles authentication — no API key is in the frontend bundle or codebase.",
  },
  {
    id: "mcp", num: "06", label: "Integration Layer", title: "MCP Server — JSON-RPC 2.0 over Streamable HTTP",
    color: C.mcp,
    chips: [
      "MCP protocol version 2024-11-05",
      "POST /api/mcp — JSON-RPC 2.0 request handler",
      "GET /api/mcp — SSE stream endpoint",
      "6 tools: list_candidates, get_candidate, get_report, get_analytics, get_alerts, get_my_report",
      "Operator tools — full platform access",
      "Candidate tool — portal token-gated (get_my_report)",
      "Claude Desktop config (claude_desktop_config.json)",
      "Cursor config (.cursor/mcp.json)",
      "VS Code Copilot config (.vscode/mcp.json)",
      "No API key required (open demo access)",
    ],
    rationale: "MCP is the emerging standard for connecting AI assistants to live data systems. Building a compliant MCP server means a Checkr case manager using Claude Desktop can ask 'show me all flagged candidates from today' and get a live answer from the production database — without opening a browser, writing a query, or waiting for a report to run. For the RealPage Director of AI Agent Solution Consulting, this is exactly the capability they are responsible for scaling: AI agents that connect to existing enterprise systems and answer operational questions in natural language. Building a working, spec-compliant MCP server demonstrates fluency in the protocol layer that makes AI agents production-grade, not just demo-grade.",
  },
];

// ─── Lifecycle steps ──────────────────────────────────────────────────────────
const LIFECYCLE = [
  {
    step: 1, actor: "Case Manager", action: "Create candidate",
    detail: "Name, DOB, SSN last-4, position, email — and Screening Type (Employment or Tenant). The type gates which check package runs downstream. A unique 32-byte portal token is generated at creation.",
    decision: "SSN last-4 only, not full SSN. This reduces PII surface area dramatically while still enabling identity disambiguation across candidates with the same name and DOB. A Staff PM's job is to not collect data you don't need — it reduces breach liability and CCPA scope simultaneously.",
  },
  {
    step: 2, actor: "System", action: "Package selection",
    detail: "Employment → criminal, employment verification, education, driving record. Tenant → criminal, credit report, eviction history. Packages are server-side configuration in SCREENING_PACKAGES.",
    decision: "Packages are server-side config, not client-side toggles. An operator cannot accidentally run a credit check on a job applicant (FCRA violation) or skip an eviction check on a tenant. The system enforces the right check set for the regulated vertical — the UI cannot override it.",
  },
  {
    step: 3, actor: "Simulation Engine", action: "Run checks + intelligent orchestration",
    detail: "Each check type has its own config: turnaround range, flag probability, confidence scoring, status vocabulary. The orchestration layer selects the fastest verification path per check type — large employer → automated HR query; small biz → manual queue; self-employed → tax doc path. Routing decisions and estimated turnarounds are recorded in check_results.details.",
    decision: "Probabilistic outcomes — not hardcoded pass/fail — let the demo show every possible state transition across repeated runs. The orchestration routing is a PM signal: surfacing why a check is taking longer (manual path vs automated path) converts operator frustration into transparency, which is an OKR, not a feature.",
  },
  {
    step: 4, actor: "AI Intelligence Panel", action: "Deep-dive verification signals",
    detail: "If a check flags, the operator opens the AI Intelligence tab: paste the raw charge string → Charge Classifier (category / severity / disposition / ruleset decision) → Charge Explainer (EEOC fair-hiring context on demand). Name Matcher runs alias variants for broader database coverage. Role Matcher compares claimed title against verified record. Doc Inspector uses GPT-4o Vision on uploaded pay stubs.",
    decision: "This panel maps to the exact workflow steps a human analyst would spend 20–40 minutes on per candidate. Making it a tab — not a separate workflow, not a support ticket — means the intelligence is available in the moment of review, not 2 hours later. Reducing expert dependency is the product value proposition.",
  },
  {
    step: 5, actor: "AI Service", action: "Generate structured risk assessment",
    detail: "GPT-4o receives the candidate profile, all check results with confidence scores, routing decisions, and industry context. Returns structured JSON: overall_risk, narrative, key_findings[], recommendations[], confidence_explanation.",
    decision: "The AI receives confidence scores, not just pass/fail statuses. A 'flag' at 40% confidence is fundamentally different from one at 97% — the former warrants a second look, the latter warrants an adverse action conversation. Surfacing this to case managers reduces false-positive adverse actions.",
  },
  {
    step: 6, actor: "Case Manager", action: "Review results + AI narrative",
    detail: "Check results display with status badges, confidence scores, routing reason, and the AI-generated risk narrative. Case manager reads a plain-English summary in seconds rather than interpreting 7 raw check statuses. Report ETA shows per-check progress with estimated completion, recalculated as checks complete.",
    decision: "The AI narrative is the primary product surface — raw check statuses are secondary. Most case managers are HR generalists or property managers who need a clear recommendation, not a data dump. The AI converts expertise into accessibility.",
  },
  {
    step: 7, actor: "Case Manager", action: "Initiate FCRA adverse action (if needed)",
    detail: "Two-step FCRA flow: (1) Pre-adverse notice with reason codes. System enforces waiting period. (2) Final adverse notice only after the window elapses and the candidate has had opportunity to dispute.",
    decision: "The system physically blocks sending a final adverse notice before the waiting period. The state machine has no skip button. A case manager under time pressure, a manager override, or a UI bug cannot bypass it. The right action is the only possible action.",
  },
  {
    step: 8, actor: "Candidate", action: "Portal access via secure token",
    detail: "Candidate receives a tokenized link. No account creation required — the 32-byte URL-safe random token is the authenticator. They can view check results, submit disputes, and see per-check ETAs with estimated completion dates.",
    decision: "Removing account creation was an explicit product decision to reduce candidate friction (a stated Checkr OKR). Account creation is the highest-friction step in any consumer flow. Portal engagement rate surfaces on the Analytics dashboard as a first-class metric.",
  },
  {
    step: 9, actor: "System", action: "Post-hire continuous monitoring",
    detail: "Once a candidate is cleared and hired, operators enroll them in continuous monitoring. The system watches for new criminal filings, driving record changes, sanctions/watchlist additions, and license status changes. Alerts are severity-tiered: Critical (Initiate Adverse Action), Warning (Review), Info (Acknowledge).",
    decision: "Monitoring is where a point-in-time screening platform becomes a compliance partner. A DUI that occurs 18 months post-hire is an ongoing risk if the employee is a CDL driver. Building the enrollment and alert workflow closes the loop — hiring is not the end of the compliance story.",
  },
  {
    step: 10, actor: "System", action: "Drug testing — DOT-compliant workflow",
    detail: "Operators order drug tests (5 types) from the candidate profile. The system simulates lab processing, chain of custody, and MRO review. DOT 5-Panel tests with non-negative results are held in 'Pending MRO Review' — the result cannot be finalized until a Medical Review Officer signs off, per 49 CFR Part 40.",
    decision: "DOT compliance is structural, not advisory. The 'Mark MRO Complete' button is the only path to a finalized non-negative DOT result — the system cannot be talked past it. Same design principle as the FCRA adverse action state machine: make the right action the only possible action.",
  },
  {
    step: 11, actor: "AI Agent / Claude", action: "MCP tool access — natural language operations",
    detail: "Any MCP-compatible AI assistant (Claude Desktop, Cursor, VS Code Copilot) can connect to the ScreenIQ MCP server and query candidates, reports, analytics, and alerts using natural language. Operator tools return live DB data. The candidate get_my_report tool is portal-token gated.",
    decision: "MCP is the protocol that makes AI assistants production-grade for enterprise operations. An operator who can ask Claude 'show me all critical monitoring alerts from this week' and get a live, structured answer from the database has a fundamentally different product than one who has to open a dashboard, apply filters, and export a CSV. The MCP server is the surface that enables AI-native operations.",
  },
  {
    step: 12, actor: "System", action: "Dispute resolution and analytics feedback loop",
    detail: "Disputes trigger re-review. Resolution is recorded. All outcomes feed the analytics pipeline: dispute rate, turnaround delta, friction score by check type, backlog health, monitoring alert rate, drug test positivity rate.",
    decision: "This is the feedback loop that separates a product from a feature. Every dispute either corrects an inaccurate check (improving future accuracy) or generates a metric that drives the next product decision. The loop is the product.",
  },
];

// ─── Feature traceability ─────────────────────────────────────────────────────
const TRACEABILITY = [
  {
    feature: "Friction Analytics",
    checkr: "Seller-facing OKRs; friction reduction as PM metric",
    realpage: "—",
    principle: "Measure what operators care about, not what's easy to count",
    hypothesis: "Checkr measures product success through friction reduction on the seller side — the companies that embed Checkr into their hiring workflow. Building a friction score per check type (not just an overall number) signals I understand that different check types create different friction patterns, and that a PM's job is to know which lever to pull. An overall score hides the signal.",
  },
  {
    feature: "FCRA Adverse Action Flow",
    checkr: "FCRA compliance depth; adverse action accuracy",
    realpage: "Compliance risk reduction for property managers",
    principle: "Make the right thing the only possible thing",
    hypothesis: "Both JDs signal compliance as a core product area. The distinction between a UI reminder ('remember to wait 5 days') and a state machine enforcement ('the button is disabled until day 5') is the difference between compliance-as-afterthought and compliance-as-product-principle. Hiring managers notice which one you built.",
  },
  {
    feature: "AI WBR Generation",
    checkr: "—",
    realpage: "WBR culture; exec reporting; AI Agent Solution Consulting",
    principle: "AI should compress expertise, not replace judgment",
    hypothesis: "RealPage has a strong WBR culture internally and externally. The Director of AI Agent Solution Consulting role is specifically about helping clients operationalize AI. Building an on-demand AI WBR generator that ingests live DB metrics demonstrates the exact capability the role is responsible for scaling — not as a mockup, but as a working product with a real AI backend.",
  },
  {
    feature: "Tenant Screening Vertical",
    checkr: "—",
    realpage: "Resident screening; property management operations",
    principle: "One workflow does not fit all operator verticals",
    hypothesis: "Property managers screening rental applicants have fundamentally different needs from HR teams: different check types (credit, eviction vs employment, education), different position labeling (unit and bedroom count vs job title), different status vocabulary. Building a separate /tenant route with vertical-specific UX signals I understand that platform products must be vertical-aware, not just vertically 'supported'.",
  },
  {
    feature: "Industry Benchmarking",
    checkr: "Competitive intelligence; industry data as a product line",
    realpage: "—",
    principle: "External context makes internal data actionable",
    hypothesis: "Checkr sells benchmarking data to help customers understand their screening posture relative to industry peers — this is a real Checkr product line, not just a dashboard widget. Building a Benchmarks page with turnaround delta, flag rate comparison, and source citation signals I've internalized Checkr's product strategy, not just their feature set.",
  },
  {
    feature: "Backlog Health",
    checkr: "—",
    realpage: "Implementation health tracking; ops management at scale",
    principle: "Ops visibility is a product feature, not an internal tool",
    hypothesis: "The Director of AI Agent Solution Consulting at RealPage owns implementation health across dozens of client deployments. Backlog aging, overdue counts, on-time delivery rate, and escalation count are the exact metrics used to decide when to escalate before an SLA breach. Building this as a product surface signals I understand that RealPage's ops team is also a user persona.",
  },
  {
    feature: "AI Risk Assessment",
    checkr: "AI-powered verifications; screening accuracy improvement",
    realpage: "AI Agent Consulting; AI-driven decision support",
    principle: "The best AI feature eliminates expertise as a prerequisite",
    hypothesis: "Both JDs name AI fluency as a requirement. A narrative risk assessment that a case manager with no background check experience can read in 10 seconds — instead of interpreting 7 raw check statuses — is the product value proposition. The AI's job is to make expertise unnecessary for routine decisions while surfacing edge cases for expert review.",
  },
  {
    feature: "Candidate Portal (token-based)",
    checkr: "Candidate experience; portal engagement as OKR",
    realpage: "—",
    principle: "Friction is a bug disguised as a requirement",
    hypothesis: "Reducing candidate friction is a stated Checkr OKR. The single biggest drop-off in any consumer flow is account creation. A token-based portal has zero friction at entry — the candidate clicks a link and sees their results. Portal engagement rate surfaces on the Analytics dashboard as a first-class metric, closing the loop on what was optimized for.",
  },
  {
    feature: "OpenAPI-First Codegen",
    checkr: "Verifications platform velocity",
    realpage: "Consulting delivery speed and reliability",
    principle: "Eliminate categories of bugs before they can accumulate",
    hypothesis: "A Staff PM's architectural decisions are as important as their feature decisions. Contract-first development — where the OpenAPI spec is the source of truth and all client code is generated — eliminates an entire category of integration bugs. Every hour saved debugging a type mismatch is an hour that can be spent on product discovery.",
  },
  {
    feature: "AI Intelligence Panel",
    checkr: "AI-powered verifications; reducing analyst review time",
    realpage: "AI Agent Consulting; verification accuracy at scale",
    principle: "Surface the right intelligence at the moment of decision",
    hypothesis: "A verification analyst manually researching a criminal charge — looking up statutes, checking EEOC guidance, generating name variants for alias searches, comparing job titles against verification records — spends 20–40 minutes per candidate on work that GPT-4o can compress into 5 seconds. Making that intelligence a tab on the candidate detail page (not a separate workflow, not a support ticket) means it gets used in the moment of review, not after the decision has already been made.",
  },
  {
    feature: "Continuous Monitoring",
    checkr: "Post-hire monitoring; ongoing compliance",
    realpage: "Property compliance; resident behavior post-lease",
    principle: "A point-in-time check is a snapshot; compliance is a film",
    hypothesis: "The most significant criminal events in an employment relationship often happen 12–24 months after hire. Building post-hire monitoring as a first-class product surface — with enrollment, severity tiers, and an inline adverse action trigger — signals I understand that a background screening platform's value proposition doesn't end at hire. For CDL drivers, security personnel, or financial roles, this is a regulatory requirement, not a product nice-to-have.",
  },
  {
    feature: "Drug Testing Module",
    checkr: "—",
    realpage: "Compliance for regulated industries; DOT clients",
    principle: "Regulated workflows require structural enforcement, not reminders",
    hypothesis: "DOT-regulated drug testing (49 CFR Part 40) requires a Medical Review Officer to sign off on all non-negative results before they are finalized. Building a system where the result is literally held in 'Pending MRO Review' — not just labeled as pending, but blocked from finalization — is the same design principle as the FCRA adverse action state machine. The regulation becomes an architecture constraint, not a UX checklist item.",
  },
  {
    feature: "MCP Server (AI Agent Integration)",
    checkr: "AI-native platform; Checkr API ecosystem",
    realpage: "AI Agent Solution Consulting; enterprise AI integration",
    principle: "An AI-native platform speaks the protocol that AI agents speak",
    hypothesis: "MCP is becoming the standard for connecting AI assistants to enterprise systems. A Director of AI Agent Solution Consulting whose platform exposes an MCP server can tell every client: 'Your Claude instance can query this platform directly — no new API integration, no custom connector, no data export.' Building a spec-compliant MCP server with 6 real tools backed by live data demonstrates the integration pattern that this exact role is responsible for scaling across RealPage's client base.",
  },
];

// ─── Stack decisions ──────────────────────────────────────────────────────────
const STACK = [
  {
    choice: "React + Vite 7", category: "Frontend framework",
    pmRationale: "Vite's hot module replacement means a UX change is visible in under 100ms during development. The feedback loop between a product decision and its visual output is tight enough that a Staff PM can validate layout hypotheses without a formal QA cycle. Speed of iteration is a product property, not a development convenience.",
    alternative: "Next.js — rejected because SSR adds infrastructure complexity without benefit for an authenticated internal tool. A background check platform is not a public content site.",
  },
  {
    choice: "TanStack Query v5", category: "Data synchronization",
    pmRationale: "Background check data has natural staleness — a run started 10 minutes ago may be completed when the case manager navigates back. TanStack Query's stale-while-revalidate strategy means users always see fresh data without a manual 'Refresh' button or a polling useEffect that leaks memory on unmount.",
    alternative: "Redux + custom fetch — rejected because it requires manual cache invalidation logic. Every new endpoint is another cache key to manage. The maintenance cost grows linearly with the feature count.",
  },
  {
    choice: "FastAPI (Python 3.12)", category: "API layer",
    pmRationale: "Choosing Python was a product roadmap decision: every AI/ML library — OpenAI, LangChain, Hugging Face, future fine-tuning pipelines — is first-class in Python. The API and intelligence layers share a runtime, which means adding a new AI capability requires no new service, no new deployment config, and no cross-service API design. The MCP server is a FastAPI router — zero new infrastructure to expose any database query as an AI tool.",
    alternative: "Node.js/Express — rejected because the AI ecosystem gravity is firmly in Python. A Node backend would require a separate Python microservice the moment any ML model scoring is added to the roadmap.",
  },
  {
    choice: "PostgreSQL (raw SQL via psycopg2)", category: "Database",
    pmRationale: "ACID compliance is a product requirement for a regulated domain. A background check platform that can produce a partially-committed adverse action state is a FCRA compliance risk. Raw SQL was chosen over ORM because compliance-critical queries benefit from explicit, reviewable SQL rather than ORM-generated queries that can produce unintended joins.",
    alternative: "Prisma ORM — rejected for compliance query clarity. MongoDB — rejected because document stores make schema inconsistency too easy, creating data quality problems in compliance reporting.",
  },
  {
    choice: "Orval 8.21 (OpenAPI codegen)", category: "API client generation",
    pmRationale: "Hand-written API clients are a liability that grows with the codebase. A field renamed on the server silently breaks the frontend weeks later. Generated clients cannot drift from the spec — they are derived from it. The one-time investment in the codegen pipeline pays dividends on every subsequent API change for the lifetime of the product.",
    alternative: "Axios + manual TypeScript types — rejected because it creates linear maintenance cost growth: every endpoint change requires two manual updates across two packages with no automated validation that they stay in sync.",
  },
  {
    choice: "GPT-4o (structured JSON output)", category: "AI model + output strategy",
    pmRationale: "Structured output mode was a product requirement set before a single prompt was written. A risk assessment returning free-form text cannot be parsed into displayable fields, stored in queryable DB columns, or compared across candidates. JSON mode enforces the API contract at the model level — the LLM itself rejects malformed responses. This is designing for failure, not just for success. gpt-4o is used for vision (Doc Inspector); gpt-5.6-luna for all text tasks.",
    alternative: "Streaming text output — rejected because it produces a narrative blob, not a machine-readable product surface. You can render a stream; you cannot query it.",
  },
  {
    choice: "MCP (Model Context Protocol) — Streamable HTTP", category: "AI agent integration protocol",
    pmRationale: "MCP is the emerging standard for AI agent ↔ data system connectivity. Choosing it over a proprietary webhook or REST-only API means ScreenIQ works out of the box with Claude Desktop, Cursor, VS Code Copilot, and any future MCP-compatible client — with no additional integration work. The protocol investment compounds across every client that adopts it.",
    alternative: "Custom REST API for AI integrations — rejected because it requires a new connector per AI tool. MCP provides a single, universal integration surface that grows in value as the MCP ecosystem grows.",
  },
  {
    choice: "Probabilistic simulation engine", category: "Demo data strategy",
    pmRationale: "A hardcoded demo is only as good as the one scenario it was built for. A probabilistic simulation engine — seeded from candidate name and check type — produces realistic flag rates, confidence scores, and turnaround variance on every run. Every demo is live, every state transition is visible, and no scenario requires a reset script.",
    alternative: "Hardcoded fixture data — rejected because it produces a static demo that only shows the happy path. Real stakeholders ask 'what happens when it flags?' A probabilistic system can answer that question live.",
  },
];

// ─── Demo script ──────────────────────────────────────────────────────────────
const DEMO = [
  {
    seq: "01", page: "Dashboard", path: "/dashboard", duration: "2 min",
    talk: "Establish the 'ops nerve center' framing. Point at the Backlog Health widget first — this is the first thing a RealPage ops director checks every morning. Show the recent activity feed: the system is live, not a mockup. Note that adverse actions open is surfaced at the top level — compliance posture is always visible, never buried.",
    highlight: "Backlog Health widget, adverse actions open, recent activity feed",
  },
  {
    seq: "02", page: "Candidates → Run Screening", path: "/candidates", duration: "3 min",
    talk: "Create a new candidate or open an existing one. Show the Screening Type selector (Employment vs Tenant) — vertical-aware design. Run a screening and watch the checks populate. Open the AI Risk Assessment panel and read one paragraph aloud — this is the product. Then open the AI Intelligence tab: paste a charge string, pick a ruleset, and show the Charge Classifier output in real time. This is GPT-4o as a verification analyst.",
    highlight: "Screening type selector, AI risk narrative, AI Intelligence tab (Charge Classifier), confidence scores",
  },
  {
    seq: "03", page: "Adverse Action — FCRA Flow", path: "/adverse-action", duration: "2 min",
    talk: "Open a flagged candidate's adverse action. Walk the two-step FCRA sequence: pre-adverse notice → waiting period → final adverse. Emphasize the state machine: a case manager under time pressure cannot skip the waiting period. Compliance is structural, not procedural.",
    highlight: "Pre-adverse → adverse state machine, waiting period enforcement, notice generation",
  },
  {
    seq: "04", page: "Analytics — Checkr OKR View", path: "/analytics", duration: "2 min",
    talk: "This is the Checkr OKR page. Walk through Attach Rate, Conversion Rate, Re-Run Rate (RPR), Time to Value. Then show the Friction Score by check type — this is the metric Checkr's seller-facing PMs track. Navigate to Benchmarks to show our turnaround delta vs industry average.",
    highlight: "Four OKR hero cards, friction score by check type, benchmark delta indicators",
  },
  {
    seq: "05", page: "Tenant Screening", path: "/tenant", duration: "1 min",
    talk: "Switch to the RealPage framing. Show the dedicated tenant workflow — credit and eviction instead of employment and education, unit-centric labels. Same platform, different operator lens.",
    highlight: "Credit + eviction check types, unit-centric labels, dedicated operator workflow",
  },
  {
    seq: "06", page: "Continuous Monitoring", path: "/monitoring", duration: "2 min",
    talk: "Point at the critical alert for Keisha Monroe — new DUI filing post-hire, 8 days ago. This is the scenario that turns a one-time screening into an ongoing compliance posture. Show the 'Initiate Adverse Action' button directly on the alert card — the action is co-located with the signal. Five enrolled employees, two live alerts. The product closes the loop from hire to ongoing compliance.",
    highlight: "Critical alert card with inline adverse action, severity tiers, enrolled employees list",
  },
  {
    seq: "07", page: "Drug Testing", path: "/drug-testing", duration: "2 min",
    talk: "Show the three seeded tests: Jordan Mitchell (negative, clean), Marcus Thompson (positive, pending MRO), David Chen (DOT 5-Panel, dilute, pending MRO with 49 CFR Part 40 compliance flag). Click 'Mark MRO Complete' on one — the status updates to 'resulted' immediately. The DOT compliance flag explains exactly why the result is held. This is regulatory enforcement as UX.",
    highlight: "DOT compliance flag, Pending MRO review state, Mark MRO Complete action, chain of custody ID",
  },
  {
    seq: "08", page: "WBR Report", path: "/reports/wbr", duration: "1 min",
    talk: "Click 'Generate Fresh Report'. The AI ingests live DB metrics and produces an exec-ready narrative. Read the Risks and Recommendations sections aloud. This is the RealPage AI Agent consulting capability in product form.",
    highlight: "Live DB context in prompt, structured risks + recommendations, generate CTA",
  },
  {
    seq: "09", page: "MCP Integration", path: "/mcp-docs", duration: "2 min",
    talk: "Show the MCP endpoint and tool listing. Run the curl quick-test live in a terminal — the tools/list call returns all 6 tools in under 200ms. Then show the Claude Desktop config: 4 lines of JSON and every tool is available to Claude. Point at the candidate get_my_report tool — portal-token gated, so candidates can query their own status through Claude. This is the integration layer that makes ScreenIQ AI-native, not just AI-assisted.",
    highlight: "curl smoke test, tools/list response, Claude Desktop config, candidate tool auth pattern",
  },
  {
    seq: "10", page: "Architecture + Decisions", path: "/architecture", duration: "2 min",
    talk: "Close here to show the PM thinking behind the build. Walk through two rows of the Feature Traceability matrix — point to the MCP row and the Continuous Monitoring row. Every feature encodes a hypothesis; every hypothesis maps to a JD signal. The goal is not to prove you built a lot of features — it's to show that every decision was intentional.",
    highlight: "Feature traceability matrix (MCP + Monitoring rows), PM hypotheses, 6-layer architecture diagram",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ num, label, title, sub }: { num: string; label: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400 border border-indigo-800 rounded-full px-3 py-0.5">{num}</span>
        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{label}</span>
      </div>
      <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>
      {sub && <p className="mt-2 text-slate-400 text-sm leading-relaxed max-w-3xl">{sub}</p>}
    </div>
  );
}

function DownArrow() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-5 bg-slate-700" />
      <svg width="14" height="10" viewBox="0 0 14 10"><path d="M7 10L0.937822 0.25H13.0622L7 10Z" fill="#475569" /></svg>
    </div>
  );
}

function LayerCard({ l }: { l: typeof LAYERS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border-2 ${l.color.border} ${l.color.bg} p-5 cursor-pointer transition-all duration-200`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={`text-[10px] font-bold tracking-[0.18em] uppercase ${l.color.text} mb-1`}>Layer {l.num} — {l.label}</p>
          <h3 className="text-white font-bold text-base">{l.title}</h3>
        </div>
        <button className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ml-4 ${l.color.badge}`}>
          {open ? "▲ collapse" : "▼ PM rationale"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {l.chips.map(c => (
          <span key={c} className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${l.color.badge}`}>{c}</span>
        ))}
      </div>
      {open && (
        <div className={`mt-5 pt-4 border-t ${l.color.border}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${l.color.text} mb-2`}>Why this layer was designed this way</p>
          <p className="text-slate-300 text-sm leading-relaxed">{l.rationale}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Architecture() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-950 text-white">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: `linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-900 rounded-full opacity-10 blur-3xl translate-x-32 -translate-y-32" />
          <div className="relative max-w-5xl mx-auto px-8 py-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-indigo-400 border border-indigo-800 rounded-full px-4 py-1">
                Architecture + Design Rationale
              </span>
              <span className="text-xs text-slate-600">Staff / Principal PM perspective</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight mb-4 leading-[1.1]">
              How — and <span className="text-indigo-400">why</span> —<br />
              ScreenIQ was built
            </h1>
            <p className="text-slate-400 text-lg max-w-3xl leading-relaxed mb-10">
              This page documents the reasoning behind every structural decision: what tradeoffs were made, what product hypotheses each feature encodes, and how every line of the architecture traces back to a specific problem worth solving. Written for a technical or product audience who wants to understand the thinking, not just the output.
            </p>
            <div className="flex gap-5 flex-wrap">
              {[
                { val: "6",  label: "Architecture layers" },
                { val: "12", label: "Lifecycle steps" },
                { val: "13", label: "Features traced to JD" },
                { val: "8",  label: "Stack decisions documented" },
                { val: "5",  label: "AI sub-panels (Intelligence)" },
                { val: "6",  label: "MCP tools (live data)" },
              ].map(s => (
                <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
                  <p className="text-3xl font-black text-indigo-400">{s.val}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-14 space-y-24">

          {/* ── 00 PM Design Philosophy ───────────────────────────────────────── */}
          <section>
            <SectionHeader
              num="00" label="PM Design Philosophy"
              title="Three principles that shaped every decision"
              sub="These are not values on a slide deck. Each had a direct, traceable effect on at least one architectural or feature decision in this codebase."
            />
            <div className="grid grid-cols-3 gap-5">
              {[
                {
                  n: "I",
                  title: "Compliance is structural, not procedural",
                  body: "A system that requires humans to remember to follow FCRA or DOT procedure will eventually produce a human who forgets — usually at the worst possible moment. Every compliance rule in ScreenIQ is enforced by the system: state machines that block invalid transitions, waiting periods that disable buttons, DOT MRO holds that cannot be bypassed, adverse action sequences that cannot be reordered.",
                  effect: "Trace to: FCRA adverse action state machine (lifecycle step 7), DOT MRO review hold (drug testing step 10), waiting period enforcement on final adverse notice button.",
                  color: "border-blue-800 bg-blue-950/40", accent: "text-blue-400", eb: "border-blue-900 bg-blue-950/60 text-blue-300",
                },
                {
                  n: "II",
                  title: "AI compresses expertise, not decisions",
                  body: "The AI layer in ScreenIQ generates narratives, classifies charges, detects document anomalies, matches names and roles, and produces executive reports — but every consequential decision requires a deliberate human action. The AI's job is to make a case manager's 40-minute review take 4 minutes. It does not make decisions; it shapes the quality of decisions.",
                  effect: "Trace to: AI risk assessment (step 5), AI Intelligence panel — Charge Classifier, Explainer, Name Matcher, Role Matcher, Doc Inspector (step 4), WBR generation (/reports/wbr).",
                  color: "border-violet-800 bg-violet-950/40", accent: "text-violet-400", eb: "border-violet-900 bg-violet-950/60 text-violet-300",
                },
                {
                  n: "III",
                  title: "Metrics are a product surface, not an afterthought",
                  body: "Friction score, attach rate, conversion rate, backlog health, monitoring alert rate, and drug test positivity rate are not vanity dashboards. Each maps to a specific OKR or JD signal from the target companies. A Staff PM does not build analytics after the features are done — they design the measurement model first.",
                  effect: "Trace to: /analytics (Checkr OKR view), /analytics/benchmarks, Backlog Health widget, Continuous Monitoring stats, Drug Testing outcome counts.",
                  color: "border-emerald-800 bg-emerald-950/40", accent: "text-emerald-400", eb: "border-emerald-900 bg-emerald-950/60 text-emerald-300",
                },
              ].map(p => (
                <div key={p.n} className={`rounded-2xl border-2 p-6 ${p.color}`}>
                  <span className={`text-5xl font-black ${p.accent} opacity-30 leading-none`}>{p.n}</span>
                  <h3 className="text-white font-bold text-sm mt-3 mb-3 leading-snug">{p.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">{p.body}</p>
                  <div className={`rounded-lg border px-3 py-2 ${p.eb}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Where this shows up</p>
                    <p className="text-xs leading-relaxed">{p.effect}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 01 Architecture Diagram ───────────────────────────────────────── */}
          <section>
            <SectionHeader
              num="01" label="System Architecture"
              title="6-layer architecture — click any layer for PM rationale"
              sub="The diagram reads top-to-bottom as the request path: browser → contract → API → database and AI → MCP integration. Every layer was chosen with product consequences in mind, not just technical preference."
            />
            <div className="flex gap-6">
              <div className="flex-1">
                {LAYERS.map((l, i) => (
                  <div key={l.id}>
                    <LayerCard l={l} />
                    {i < LAYERS.length - 1 && <DownArrow />}
                  </div>
                ))}
              </div>
              <div className="w-64 shrink-0">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sticky top-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Data flow</p>
                    <div className="space-y-2">
                      {[
                        { a: "↓", d: "Browser → API: REST over HTTPS" },
                        { a: "↓", d: "API → PostgreSQL: psycopg2 raw SQL" },
                        { a: "↓", d: "API → OpenAI: via Replit AI proxy" },
                        { a: "↑", d: "PostgreSQL → API: row results" },
                        { a: "↑", d: "OpenAI → API: structured JSON" },
                        { a: "↑", d: "API → Browser: JSON responses" },
                        { a: "⇒", d: "openapi.yaml → Browser: codegen (build step)" },
                        { a: "⇔", d: "MCP client ↔ /api/mcp: JSON-RPC 2.0" },
                      ].map((d, i) => (
                        <div key={i} className="flex gap-2 text-[11px]">
                          <span className="text-indigo-400 font-bold shrink-0 w-4">{d.a}</span>
                          <span className="text-slate-400 leading-tight">{d.d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Hard constraints</p>
                    <ul className="space-y-2">
                      {[
                        "No API key in browser bundle",
                        "SSN last-4 only — minimal PII",
                        "ACID transactions for all state mutations",
                        "OpenAPI is single source of truth",
                        "All AI prompts include live DB context",
                        "DOT MRO hold is structurally enforced",
                        "FCRA waiting period blocks final notice",
                        "MCP candidate tool is portal-token gated",
                      ].map((k, i) => (
                        <li key={i} className="flex gap-2 text-[11px]">
                          <span className="text-emerald-400 shrink-0">✓</span>
                          <span className="text-slate-400 leading-tight">{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 02 Screening Lifecycle ────────────────────────────────────────── */}
          <section>
            <SectionHeader
              num="02" label="Screening Lifecycle"
              title="A background check from candidate creation to AI agent access"
              sub="Each step reflects a deliberate product decision. Click any step to read the reasoning behind it."
            />
            <div className="relative">
              <div className="absolute left-[26px] top-5 bottom-5 w-px bg-slate-800" />
              <div className="space-y-2">
                {LIFECYCLE.map((s) => {
                  const active = activeStep === s.step;
                  return (
                    <div
                      key={s.step}
                      className={`relative flex gap-5 cursor-pointer rounded-xl border transition-all duration-200 p-4
                        ${active ? "border-indigo-600 bg-indigo-950/50 shadow-lg shadow-indigo-950/50" : "border-slate-800 bg-slate-900/50 hover:border-slate-700"}`}
                      onClick={() => setActiveStep(active ? null : s.step)}
                    >
                      <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10 border-2 transition-colors
                        ${active ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-700 text-slate-500"}`}>
                        {s.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.actor}</span>
                          <span className="text-white font-semibold text-sm">{s.action}</span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{s.detail}</p>
                        {active && (
                          <div className="mt-4 pt-3 border-t border-indigo-800/60">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1.5">Design decision</p>
                            <p className="text-indigo-200 text-xs leading-relaxed">{s.decision}</p>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs shrink-0 mt-0.5 ${active ? "text-indigo-400" : "text-slate-600"}`}>
                        {active ? "▲" : "▼"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── 03 Feature Traceability ───────────────────────────────────────── */}
          <section>
            <SectionHeader
              num="03" label="Feature Traceability Matrix"
              title="Every feature traces to a JD signal and a PM hypothesis"
              sub="A Staff PM does not build features because they are interesting. They build features because each one encodes a falsifiable hypothesis about value. Click any row to read the full reasoning."
            />
            <div className="rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-44">Feature</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-blue-500 w-44">Checkr JD signal</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-emerald-500 w-44">RealPage JD signal</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">PM principle</th>
                  </tr>
                </thead>
                <tbody>
                  {TRACEABILITY.map((r, i) => {
                    const active = activeFeature === i;
                    return (
                      <React.Fragment key={r.feature}>
                        <tr
                          className={`border-b border-slate-800/60 cursor-pointer transition-colors ${active ? "bg-indigo-950/50" : "hover:bg-slate-900/60"}`}
                          onClick={() => setActiveFeature(active ? null : i)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${active ? "text-indigo-400" : "text-slate-600"}`}>{active ? "▲" : "▼"}</span>
                              <span className="text-white font-semibold text-xs">{r.feature}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-blue-300/80 leading-snug">{r.checkr}</td>
                          <td className="py-3 px-4 text-xs text-emerald-300/80 leading-snug">{r.realpage}</td>
                          <td className="py-3 px-4 text-xs text-slate-500 italic leading-snug">"{r.principle}"</td>
                        </tr>
                        {active && (
                          <tr className="bg-indigo-950/40 border-b border-slate-800/60">
                            <td colSpan={4} className="px-4 pb-5 pt-3">
                              <div className="bg-indigo-950/60 border border-indigo-800/60 rounded-xl p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">PM Hypothesis</p>
                                <p className="text-indigo-100 text-xs leading-relaxed">{r.hypothesis}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 04 Technology Rationale ───────────────────────────────────────── */}
          <section>
            <SectionHeader
              num="04" label="Technology Rationale"
              title="Every stack choice was a product decision first"
              sub="A Staff PM who understands why each technology was chosen can defend roadmap implications, evaluate tradeoffs in design reviews, and identify when the stack is becoming a constraint on product velocity."
            />
            <div className="grid grid-cols-2 gap-4">
              {STACK.map((d) => (
                <div key={d.choice} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{d.category}</p>
                  <h4 className="text-white font-bold text-sm mb-3">{d.choice}</h4>
                  <p className="text-slate-300 text-xs leading-relaxed mb-4">{d.pmRationale}</p>
                  <div className="bg-slate-800/60 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Alternative considered + reason rejected</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{d.alternative}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 05 Demo Script ────────────────────────────────────────────────── */}
          <section>
            <SectionHeader
              num="05" label="Demo Script"
              title="Suggested walkthrough order — 20-minute product demo"
              sub="The order is deliberate: ops context (Dashboard) → live screening + AI Intelligence → FCRA compliance → Checkr OKRs → RealPage tenant → Continuous Monitoring → Drug Testing (DOT) → WBR → MCP → close with architecture. Each segment builds on the previous one."
            />
            <div className="space-y-3">
              {DEMO.map((s) => (
                <div key={s.seq} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex gap-5">
                  <div className="shrink-0 text-center w-12">
                    <span className="text-4xl font-black text-slate-800 leading-none">{s.seq}</span>
                    <p className="text-[10px] text-slate-600 mt-1 font-mono">{s.duration}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{s.page}</span>
                      <span className="text-xs font-mono text-slate-500">{s.path}</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">{s.talk}</p>
                    <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Point at</p>
                      <p className="text-slate-300 text-xs">{s.highlight}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer ────────────────────────────────────────────────────────── */}
          <div className="border-t border-slate-800 pt-10 pb-6 text-center space-y-2">
            <p className="text-slate-500 text-xs">
              ScreenIQ — a portfolio artifact demonstrating AI-native product thinking at the Staff / Principal PM level.
            </p>
            <p className="text-slate-700 text-xs font-mono">
              React + Vite · FastAPI · PostgreSQL · OpenAI GPT-4o · MCP (JSON-RPC 2.0) · Orval codegen · TanStack Query · shadcn/ui · Recharts
            </p>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
