---
name: ScreenIQ Architecture
description: Key decisions for the ScreenIQ background screening platform build.
---

## Stack
- **Frontend**: React + Vite artifact at slug `screeniq`, preview path `/`
- **Backend**: Python FastAPI in `artifacts/screeniq-api/`, served via `artifacts/api-server` artifact at `/api`
- **DB**: PostgreSQL, Drizzle schema in `lib/db/src/schema/`, Python reads via psycopg2 directly
- **AI**: Replit AI Integrations OpenAI — env vars `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`

## Critical: api-server workflow run command
Must use absolute path: `cd /home/runner/workspace/artifacts/screeniq-api && pip install -r requirements.txt -q && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --reload`
Relative `cd artifacts/screeniq-api` fails because workflow shell starts in a different cwd.

**Why:** The Replit workflow shell's cwd is not guaranteed to be the workspace root.

## Zod codegen fix
Orval 8.21.0 generates `zod.looseObject` (Zod v4 API) but workspace uses Zod v3.
**Fix:** After running codegen, `sed -i 's/zod\.looseObject/zod.object/g' lib/api-zod/src/generated/api.ts`

## Hook import rule
All generated hooks and QueryKey helpers are re-exported from `@workspace/api-client-react` root.
Deep imports like `@workspace/api-client-react/src/generated/api` are NOT valid package specifiers — always use the root import.
