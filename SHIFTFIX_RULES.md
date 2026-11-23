# ShiftFix project rules

## Stack
- Next.js App Router + TypeScript strict
- Supabase for durable demo state when configured; otherwise memory + browser localStorage
- AI: `AI_PROVIDER=bob|watsonx|rules` (no local models / no Ollama)
- Tailwind, Vitest, Playwright

## Architecture
- Language only in `lib/ai/` (Bob / watsonx / rules)
- Decisions only in `lib/coverage/` and `lib/agent/`
- Transitions via `lib/coverage/stateMachine.ts`

## Git
Do not commit or push unless Aidar asks. Show the commit message first and wait.
