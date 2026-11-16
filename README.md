# ShiftFix

AI agent that covers a call-out shift without the manager texting anyone.

Hackathon prototype for the **AI Builders Challenge** (AI for Business). Built with **IBM Bob**.

## Demo flow

1. Schedule shows Amanda on Monday 11am–5pm (barista).
2. Amanda posts in team chat that she can’t make it.
3. ShiftFix replies “okay, looking”, skips Jordan (working + not barista), DMs Arlo.
4. Arlo says yes → ShiftFix asks the manager.
5. Manager types `confirm` → schedule flips to Arlo, audit log records every step.

## Stack

- Next.js App Router + TypeScript (strict)
- In-memory demo store (Supabase SQL migrations included for later)
- IBM Granite via watsonx.ai, Ollama fallback, or `AI_PROVIDER=mock`
- Tailwind CSS
- Vitest + Playwright

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test          # unit (eligibility, ranking, state machine, interpreter)
npm run test:e2e  # full Amanda → Arlo → manager demo
```

## Architecture

- **Granite** (`lib/ai/`): language only — intents + friendly copy.
- **TypeScript** (`lib/coverage/`): eligibility, ranking, state machine.
- Transitions only through `lib/coverage/stateMachine.ts`.
- Every transition writes `audit_events`.

## How we used IBM Bob

ShiftFix was planned and implemented with IBM Bob as the primary build tool: architecture, coverage engine, chat UI, demo controls, and tests.
