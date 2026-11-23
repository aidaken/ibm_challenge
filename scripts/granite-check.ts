#!/usr/bin/env tsx
/**
 * Smoke-test the interpreter against sample sentences.
 * Usage: npm run granite:check
 * Reads AI_PROVIDER (defaults to rules). Prints provider + model id per line.
 */

import {
  activeModelId,
  effectiveProvider,
  interpretMessage,
} from "../lib/ai/granite";
import type { InterpretContext } from "../lib/ai/prompts";

const ctx: InterpretContext = {
  senderName: "TestUser",
  senderRole: "barista",
  channel: "group",
  hasOpenOffer: false,
  upcomingShifts: "Monday 10am-6pm barista",
};

const CASES: { text: string; expected: string }[] = [
  { text: "hey I'm not available for my Monday shift, can someone cover me?", expected: "call_out" },
  { text: "can't make it, kid's sick", expected: "call_out" },
  { text: "yes", expected: "accept" },
  { text: "sure i can do it", expected: "accept" },
  { text: "nah sorry", expected: "decline" },
  { text: "i can only do till 2pm", expected: "partial_availability" },
  { text: "what time is the shift again?", expected: "question" },
];

void (async () => {
  const provider = effectiveProvider();
  const model = activeModelId(provider) ?? "-";
  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

  console.log(`\nInterpreter check — provider: ${provider}  model: ${model}\n`);
  console.log(
    `${"Message".padEnd(55)}  ${"Expected".padEnd(22)}  ${"Got".padEnd(22)}  Conf   Pass  Provider  Model  ms`,
  );
  console.log("─".repeat(140));

  let passed = 0;
  for (const c of CASES) {
    const result = await interpretMessage({
      message: c.text,
      context: ctx,
      provider,
    });
    const ok = result.intent === c.expected;
    if (ok) passed++;
    const ms = result.latencyMs > 0 ? String(result.latencyMs) : "0";
    const mid = result.modelId ?? "-";
    console.log(
      `${pad(c.text, 55)}  ${pad(c.expected, 22)}  ${pad(result.intent, 22)}  ${result.confidence.toFixed(2)}   ${ok ? "ok" : "FAIL"}   ${pad(result.provider, 8)}  ${pad(mid, 28)}  ${ms}`,
    );
  }

  console.log(`\n${passed}/${CASES.length} passed`);
  if (passed < CASES.length) process.exit(1);
})();
