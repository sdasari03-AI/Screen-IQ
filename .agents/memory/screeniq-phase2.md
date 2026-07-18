---
name: ScreenIQ Phase 2
description: Phase 2 features — analytics, WBR, tenant screening, benchmarks, architecture page; candidates router screening_type fix; seeding caveat; JSX table fix
---

## Features Added
- `/analytics` — Checkr OKR hero cards + check-type pie + friction bar chart (Recharts)
- `/analytics/benchmarks` — industry benchmark grouped bar chart with delta indicators
- `/reports/wbr` — AI WBR narrative with Generate button (POST mutation)
- `/tenant` — tenant/resident screening list, filters by screeningType === 'tenant' client-side
- `/architecture` — Staff PM architecture + design rationale page (6 sections, all interactive)
- Dashboard backlog health widget, Compliance benchmarks table section
- Candidates list/detail: screeningType badge, check type defaults per screening type

## Architecture Page Structure
Route: /architecture, nav item: "Architecture" (Network icon from lucide-react)
Sections: 00 PM Design Philosophy (3 principles) · 01 5-layer architecture diagram (clickable PM rationale per layer) · 02 8-step screening lifecycle (clickable design decisions) · 03 Feature Traceability Matrix (9 rows, React.Fragment key per row, expandable PM hypotheses) · 04 Technology Rationale (6 stack cards) · 05 Demo Script (7 steps with talking points)

## JSX Table Pitfall (important)
When a `.map()` inside `<tbody>` needs to return two sibling `<tr>` elements (one for the row, one for an optional expanded detail row), the ONLY correct pattern is:
```tsx
<tbody>
  {data.map((r, i) => (
    <React.Fragment key={r.id}>
      <tr>...</tr>
      {active && <tr>...</tr>}
    </React.Fragment>
  ))}
</tbody>
```
- `<React.Fragment key={...}>` is required for the key (shorthand `<>` doesn't support key)
- Never nest `<tbody>` inside another `<tbody>` — JSX parser rejects it
- Never put the map result outside `<tbody>` as a direct `<table>` child

## Candidates Router: screening_type
The `candidates.py` router was missing `screening_type` from all SELECT, INSERT, and UPDATE queries. After adding it, `row_to_candidate` maps `row[12]` to `screeningType`. The `list_candidates` endpoint accepts `?screeningType=` query param. All SELECT statements use `COALESCE(c.screening_type, 'employment')`.

**Why:** The `screening_type` column was added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `database.py`, so existing rows have NULL. COALESCE handles this.

## Seeding Caveat
`_seed_demo_data()` in `main.py` returns early if `SELECT COUNT(*) FROM candidates > 0`. Tenant demo candidates (Sarah Kim id=6, Robert Hayes id=7) were inserted via POST API after initial seed, then PATCHed to `screening_type = 'tenant'` once the router fix was live.

## Codegen Fix (always apply after codegen)
`sed -i 's/zod\.looseObject/zod.object/g' lib/api-zod/src/generated/api.ts`

## TDZ Pitfall
`useEffect` referencing a `const` from a hook must come AFTER the hook call — JavaScript TDZ applies even within function components.
