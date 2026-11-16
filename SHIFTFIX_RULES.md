# ShiftFix project rules

Written by IBM Bob.

## What we're building
ShiftFix is an AI agent that gets a call-out shift covered without the manager texting anyone.
Granite handles LANGUAGE only. TypeScript handles DECISIONS.

## Stack (do not swap without asking)
- Next.js (App Router) + TypeScript, strict mode
- Supabase SQL in `supabase/` (runtime demo uses file-backed store until Supabase is wired)
- IBM Granite via watsonx.ai, Ollama fallback, or `AI_PROVIDER=mock`
- Tailwind CSS, Vercel
- Vitest + Playwright

## Folder layout
- `app/` pages and API routes
- `lib/ai/` Granite client, prompts, Zod schemas
- `lib/coverage/` eligibility, ranking, state machine
- `lib/db/` store, seed, queries
- `components/chat/` team-chat UI (GroupMe-inspired, no GroupMe branding)
- `supabase/` migrations and seed

## Git
Do not commit, push, or open PRs until Aidar asks. Show the commit message first and wait.
