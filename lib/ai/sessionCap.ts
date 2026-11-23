/**
 * Per-process model-call budget so a live demo cannot burn credits.
 * Resets when the serverless isolate cold-starts (acceptable for hackathon).
 */

const GLOBAL_KEY = "__shiftfix_ai_call_count__";

function counter(): { count: number } {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: { count: number };
  };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { count: 0 };
  return g[GLOBAL_KEY];
}

export function getMaxAiCallsPerSession(): number {
  const raw = process.env.AI_MAX_CALLS_PER_SESSION;
  const n = raw ? Number.parseInt(raw, 10) : 60;
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export function getAiCallCount(): number {
  return counter().count;
}

export function resetAiCallCount(): void {
  counter().count = 0;
}

/** Returns true if another model call is allowed; increments when reserved. */
export function tryReserveAiCall(): boolean {
  const c = counter();
  if (c.count >= getMaxAiCallsPerSession()) return false;
  c.count += 1;
  return true;
}
