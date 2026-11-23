# ShiftFix

When an employee can't make a shift, ShiftFix understands their message, finds the best replacement (or splits the shift between people), messages them, handles replies, and assigns the shift automatically. The manager only steps in when the agent truly can't solve it.

Built for the **IBM AI Builders Challenge — AI for Business** track.

---

## Three differentiators

1. **AI shift splitting.** If nobody can cover the whole shift, TypeScript computes a 2- or 3-person split, DMs each person, and only marks covered when every part is confirmed. A decline replaces just that part.
2. **Handles declines and timeouts on its own.** Fast-forward expires offers; the agent moves to the next candidate or part without the manager.
3. **Zero manager work, fully explained.** Acceptance auto-assigns. The manager gets a short "covered" DM. **Agent Activity** shows every decision and why.

---

## AI approach and architecture

```
Worker message
      │
      ▼
  Language model (IBM Bob or watsonx Granite)  OR  rules fallback
      │     LANGUAGE ONLY → intent JSON (Zod) + friendly copy
      ▼
  TypeScript ── ALL DECISIONS ──► eligibility, ranking, splitting, assignment
      │
      ▼
  State machine (lib/coverage/stateMachine.ts)
      │
  open → planning → offering → covered | escalated
      ▼
  Store: Supabase snapshot (preferred) | memory + browser localStorage
```

`AI_PROVIDER` options: `bob` | `watsonx` | `rules`.

- Missing Bob/watsonx credentials → one-line warning → **rules** (demo still works).
- Max 1 retry, 8s timeout, `AI_MAX_CALLS_PER_SESSION` (default 60).
- Keys are server-side only (`BOB_*`, `WATSONX_*`). Never `NEXT_PUBLIC_` for secrets.

Bob request shape lives in `lib/ai/providers/bob.ts` (search for `CONFIRM:`).

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 App Router + TypeScript strict |
| Data | Supabase (`demo_snapshots` + SQL migrations) or memory + localStorage |
| AI | IBM Bob inference, watsonx.ai, or `rules` |
| UI | Tailwind CSS |
| Host | Vercel |
| Tests | Vitest + Playwright |

---

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default `.env.local`:

```
AI_PROVIDER=rules
```

### Environment variables

See `.env.example`. Summary:

| Variable | Where |
| --- | --- |
| `AI_PROVIDER` | `bob` \| `watsonx` \| `rules` |
| `AI_MAX_CALLS_PER_SESSION` | optional, default 60 |
| `BOB_API_KEY` | bob.ibm.com key (required for `bob`) |
| `BOB_TEAM_ID` | optional — General keys only |
| `BOB_INFERENCE_URL` | optional — defaults to Bob us-east chat completions |
| `BOB_MODEL_ID` | optional — default `premium` |
| `WATSONX_API_KEY` / `WATSONX_PROJECT_ID` / `WATSONX_URL` / `GRANITE_MODEL_ID` | watsonx alternative |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | durable demo on Vercel |

### Vercel

Set the same vars in the Vercel project (Production + Preview). Recommended for the public demo:

- `AI_PROVIDER=bob` with `BOB_API_KEY` (+ optional `BOB_MODEL_ID=premium`)
- Or `AI_PROVIDER=rules` for offline / CI demos
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and run migrations `001` + `002`)

No `vercel.json` is required for this Next.js app.

Without Supabase, the demo still runs using server memory plus **browser localStorage** (survives refresh on the same browser; admin **Reset demo** clears it).

---

## Tests

```bash
npm test                 # unit
npm run test:e2e         # Playwright (AI_PROVIDER=rules, no keys)
npm run granite:check    # interpreter smoke (prints provider + model)
npx tsc --noEmit
npm run build
```

---

## Demo script (UI)

Use the floating **Demo Coach** (bottom-left) — three paths map to the differentiators. Prefer **Run this path** in order 1 → 2 → 3, or tap **Do** on each step.

| Path | Differentiator | What to show |
| --- | --- | --- |
| **1 · Split** | AI shift splitting | Reset → schedule → Amanda call-out → Agent Activity (split + skips) → Maya’s offer DM |
| **2 · Self-heal** | Declines / timeouts | Maya accepts → Arlo declines (or optional **Fast-forward timeout**) → David’s offer |
| **3 · Explained** | Zero manager work | David accepts → Schedule covered → **Sam** manager DM → full Agent Activity |

### Manual fallback (same story)

1. Admin ⚙ → **Reset demo**
2. Posting as **Amanda** → Team chat:  
   `hey I'm not available for my Monday shift, can someone cover me?`
3. Open DMs → **Maya** → Accept (or `yes`)
4. **Arlo** → Decline (or `no`) — or ⚙ **Fast forward** to expire a pending part
5. **David** → Accept
6. Check **Schedule**, persona **Sam** DM, and **Agent Activity**
