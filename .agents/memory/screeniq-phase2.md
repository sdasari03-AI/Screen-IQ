---
name: ScreenIQ Phase 2
description: Phase 2 features — analytics, WBR, tenant screening, benchmarks; candidates router screening_type; seeding order caveat
---

## Features Added
- `/analytics` — Checkr OKR hero cards + check-type pie + friction bar chart (Recharts)
- `/analytics/benchmarks` — industry benchmark grouped bar chart with delta indicators
- `/reports/wbr` — AI WBR narrative with Generate button (POST mutation)
- `/tenant` — tenant/resident screening list, filters by screeningType === 'tenant' client-side
- Dashboard backlog health widget
- Compliance benchmarks table section
- Candidates list/detail: screeningType badge, check type defaults per screening type

## Candidates Router: screening_type
The `candidates.py` router was missing `screening_type` from all SELECT, INSERT, and UPDATE queries. After adding it, `row_to_candidate` maps `row[12]` to `screeningType`. The `list_candidates` endpoint accepts `?screeningType=` query param for server-side filtering. All SELECT statements use `COALESCE(c.screening_type, 'employment')`.

**Why:** The `screening_type` column was added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `database.py`, so existing rows have NULL. COALESCE handles this.

## Seeding Caveat
`_seed_demo_data()` in `main.py` returns early if `SELECT COUNT(*) FROM candidates > 0`. Tenant demo candidates (Sarah Kim, Robert Hayes) must be inserted via the API or direct SQL after the first run if they weren't in the initial seed. They were seeded manually as IDs 6 and 7 with `screening_type = 'tenant'`.

## Hook Import Fix
After codegen, always run: `sed -i 's/zod\.looseObject/zod.object/g' lib/api-zod/src/generated/api.ts`

## TDZ Pitfall
`useEffect` referencing a `const` from a hook must come AFTER the hook call — JavaScript TDZ applies even within function components.
