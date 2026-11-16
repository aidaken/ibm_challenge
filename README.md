# ShiftFix

AI agent that gets a call-out shift covered without the manager texting anyone.

Hackathon prototype for the **AI Builders Challenge** — **AI for Business** track.  
Deadline target: Dec 2, 5pm ET. Built primarily with **IBM Bob**.

## Problem

Someone calls out at 6am. The manager spends the morning texting people one by one, waiting on replies, and fixing the schedule by hand. Small cafes still run this on group chats and spreadsheets.

## Solution

1. Worker posts a call-out in the team chat.
2. ShiftFix (Granite) reads the message as language only.
3. TypeScript picks who is eligible and ranks them.
4. The agent DMs candidates until someone says yes.
5. Manager confirms once → schedule updates → every step hits the audit log.

## Demo flow (always keep this green)

1. Schedule shows **Amanda** on Monday 11am–5pm (barista).
2. Amanda: `hey I'm not available for my Monday morning shift, can someone cover me?`
3. ShiftFix: `okay, looking`
4. Engine skips **Jordan** (already working + not barista), picks **Arlo**.
5. DM Arlo → Arlo: `yes` → ShiftFix checks with the manager.
6. Manager: `confirm` → schedule flips to Arlo, audit log shows every step.

## Stack

| Layer | Pick |
| --- | --- |
| App | Next.js App Router + TypeScript (strict) |
| Data | File/tmp demo store + Supabase SQL migrations for later |
| AI | IBM Granite on watsonx.ai, Ollama fallback, or `AI_PROVIDER=mock` |
| UI | Tailwind, GroupMe-inspired chat (no GroupMe branding) |
| Host | Vercel |
| Tests | Vitest (logic) + Playwright (demo flow) |

## Architecture

- **Granite** (`lib/ai/`): language only — intent JSON + friendly copy.
- **TypeScript** (`lib/coverage/`): eligibility, ranking, state machine.
- Interpreter returns Zod-validated JSON. Confidence &lt; 0.7 → clarifying question.
- Coverage states: `open → offering → pending_approval → filled` (or `escalated`).
- Transitions only through `lib/coverage/stateMachine.ts`, each with an audit row.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Env

See `.env.example`. For local/demo without watsonx:

```
AI_PROVIDER=mock
```

## Tests

```bash
npm test          # unit: eligibility, ranking, state machine, interpreter, agent flow
npm run test:e2e  # Playwright: exact Amanda → Arlo → manager demo
```

## How we used IBM Bob

IBM Bob is the main build tool for this project (judges score Bob usage):

- Plan mode for architecture and task breakdown
- Agent mode for feature builds (coverage engine, chat UI, demo controls, tests)
- Project rules in `SHIFTFIX_RULES.md` so Bob keeps the stack and naming
- Bob-authored tests kept green before each handoff
- README documents the Bob-first workflow for the submission page

## Non-goals

Real GroupMe/Slack/SMS, payroll, time clocks, multi-location, real employee data.
