/**
 * Language client: bob | watsonx | rules (AI_PROVIDER).
 * Granite/Bob handle LANGUAGE only — never eligibility or state changes.
 */

import {
  CONFIDENCE_THRESHOLD,
  InterpretationSchema,
  type Interpretation,
} from "@/lib/ai/schemas";
import {
  buildInterpretPrompt,
  buildWriteMessagePrompt,
  buildExplainDecisionPrompt,
  templateOfferDm,
  templateLookingReply,
  templateConfirmDm,
  templateGroupAnnouncement,
  templateSplitAnnouncement,
  templateManagerDm,
  templateClarifyReply,
  templateEscalate,
  templateDeclineNext,
  templateOverlapTaken,
  type InterpretContext,
  type MessageFacts,
  type MessageKind,
  type DecisionFacts,
} from "@/lib/ai/prompts";
import { bobConfigStatus, callBobChat } from "@/lib/ai/providers/bob";
import { callWatsonxChat, watsonxModelId } from "@/lib/ai/providers/watsonx";
import { tryReserveAiCall } from "@/lib/ai/sessionCap";

export type AiProvider = "bob" | "watsonx" | "rules";

export interface GraniteResult {
  text: string;
  provider: AiProvider;
  modelId?: string;
  latencyMs: number;
}

export interface InterpretResult extends Interpretation {
  provider: AiProvider;
  modelId?: string;
  latencyMs: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

let warnedBobMissing = false;
let warnedCap = false;

function resolveProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "rules").toLowerCase().trim();
  if (raw === "bob" || raw === "watsonx" || raw === "rules") return raw;
  if (raw === "mock" || raw === "ollama") return "rules";
  return "rules";
}

/** Effective provider after env readiness checks. */
export function effectiveProvider(
  override?: AiProvider,
): AiProvider {
  const provider = override ?? resolveProvider();
  if (provider === "bob") {
    const cfg = bobConfigStatus();
    if (!cfg.ready) {
      if (!warnedBobMissing) {
        warnedBobMissing = true;
        console.warn(
          `[ai] AI_PROVIDER=bob but missing ${cfg.missing.join(", ")} — using rules`,
        );
      }
      return "rules";
    }
  }
  if (provider === "watsonx") {
    if (!process.env.WATSONX_API_KEY || !process.env.WATSONX_PROJECT_ID) {
      console.warn(
        "[ai] AI_PROVIDER=watsonx but WATSONX_API_KEY/PROJECT_ID missing — using rules",
      );
      return "rules";
    }
  }
  return provider;
}

export function activeModelId(provider: AiProvider): string | undefined {
  if (provider === "bob") return bobConfigStatus().modelId;
  if (provider === "watsonx") return watsonxModelId();
  return undefined;
}

async function callModel(
  provider: AiProvider,
  messages: ChatMessage[],
): Promise<{ text: string; modelId: string }> {
  if (provider === "rules") {
    throw new Error("callModel: cannot call rules provider");
  }
  if (!tryReserveAiCall()) {
    if (!warnedCap) {
      warnedCap = true;
      console.warn("[ai] session model call cap reached — using rules");
    }
    throw new Error("AI_MAX_CALLS_PER_SESSION exceeded");
  }
  if (provider === "bob") {
    const r = await callBobChat(messages, { timeoutMs: 8_000 });
    return { text: r.text, modelId: r.modelId };
  }
  return callWatsonxChat(messages);
}

export function rulesInterpret(message: string): Interpretation {
  const text = message.toLowerCase().trim();

  if (
    /\b(can't|cannot|cant|not available|call.?out|sick|cover me|someone cover|won't make|can't make|wont make)\b/.test(
      text,
    )
  ) {
    return { intent: "call_out", shift_ref: "monday", confidence: 0.92 };
  }
  if (
    /\bi can only (do|work|cover|be there)/.test(text) ||
    /available (from|until|till|to)/.test(text)
  ) {
    return { intent: "partial_availability", confidence: 0.85 };
  }
  if (
    /^(yes|yep|yeah|i can|i'll take it|ill take it|sure|absolutely|of course|sounds good)\b/.test(
      text,
    )
  ) {
    return { intent: "accept", confidence: 0.93 };
  }
  if (
    /^(no|nope|can't|cannot|pass|decline|sorry|nah|not today|i can't)\b/.test(
      text,
    )
  ) {
    return { intent: "decline", confidence: 0.9 };
  }
  if (/\?/.test(text)) {
    return { intent: "question", confidence: 0.75 };
  }
  return { intent: "other", confidence: 0.4 };
}

/** @deprecated use rulesInterpret */
export const mockInterpret = rulesInterpret;

function parseInterpretation(raw: string): Interpretation | null {
  const stripped = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    const result = InterpretationSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface InterpretOptions {
  message: string;
  context: InterpretContext;
  provider?: AiProvider;
}

export async function interpretMessage(
  options: InterpretOptions,
): Promise<InterpretResult> {
  const provider = effectiveProvider(options.provider);

  if (provider === "rules") {
    return { ...rulesInterpret(options.message), provider: "rules", latencyMs: 0 };
  }

  const prompt = buildInterpretPrompt(options.message, options.context);
  const messages: ChatMessage[] = [
    { role: "system", content: "You are ShiftFix. Return only valid JSON." },
    { role: "user", content: prompt },
  ];

  const t0 = Date.now();
  let raw: string | null = null;
  let modelId: string | undefined;

  try {
    const r = await callModel(provider, messages);
    raw = r.text;
    modelId = r.modelId;
  } catch (err) {
    console.error("[ai] interpretMessage attempt 1 failed:", err);
  }

  let parsed = raw !== null ? parseInterpretation(raw) : null;

  if (parsed === null) {
    try {
      const r = await callModel(provider, messages);
      raw = r.text;
      modelId = r.modelId;
      parsed = raw !== null ? parseInterpretation(raw) : null;
    } catch (err) {
      console.error("[ai] interpretMessage attempt 2 failed:", err);
    }
  }

  const latencyMs = Date.now() - t0;

  if (parsed !== null) {
    return { ...parsed, provider, modelId, latencyMs };
  }

  console.warn(`[ai] falling back to rules after ${provider} failed`);
  return { ...rulesInterpret(options.message), provider: "rules", latencyMs };
}

function verifyFacts(text: string, facts: MessageFacts): boolean {
  if (!facts.dayLabel || !facts.windowLabel) return true;
  const startTime = facts.windowLabel.split(" to ")[0];
  return text.includes(facts.dayLabel) && text.includes(startTime);
}

function getFallback(facts: MessageFacts): string {
  switch (facts.kind) {
    case "offer_dm":
      return templateOfferDm({
        candidateName: facts.candidateName ?? "there",
        callOutName: facts.callOutName ?? "someone",
        dayLabel: facts.dayLabel ?? "",
        windowLabel: facts.windowLabel ?? "",
      });
    case "looking_reply":
      return templateLookingReply();
    case "confirm_dm":
    case "part_confirm_dm":
      return templateConfirmDm({
        dayLabel: facts.dayLabel ?? "",
        windowLabel: facts.windowLabel ?? "",
      });
    case "group_announcement":
      return templateGroupAnnouncement({
        dayLabel: facts.dayLabel ?? "",
        windowLabel: facts.windowLabel ?? "",
        name: facts.candidateName ?? "someone",
      });
    case "split_announcement":
      return templateSplitAnnouncement({
        dayLabel: facts.dayLabel ?? "",
        windowLabel: facts.windowLabel ?? "",
        coverageDesc: facts.coverageDesc ?? "",
      });
    case "manager_dm":
      return templateManagerDm({
        dayLabel: facts.dayLabel ?? "",
        windowLabel: facts.windowLabel ?? "",
        coverageDesc: facts.coverageDesc ?? facts.candidateName ?? "someone",
      });
    case "clarify":
      return templateClarifyReply();
    case "escalate":
      return templateEscalate(facts.skipReasons ?? []);
    case "decline_next":
      return templateDeclineNext();
    case "overlap_taken":
      return templateOverlapTaken();
  }
}

export async function writeMessage(
  facts: MessageFacts,
  providerOverride?: AiProvider,
): Promise<GraniteResult> {
  const provider = effectiveProvider(providerOverride);
  const fallback = getFallback(facts);

  if (provider === "rules") {
    return { text: fallback, provider: "rules", latencyMs: 0 };
  }

  const prompt = buildWriteMessagePrompt(facts);
  const messages: ChatMessage[] = [
    { role: "system", content: "You are ShiftFix. Write one short message." },
    { role: "user", content: prompt },
  ];

  const t0 = Date.now();
  let generated: string | null = null;
  let modelId: string | undefined;

  try {
    const r = await callModel(provider, messages);
    modelId = r.modelId;
    generated = r.text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^["']|["']$/g, "")
      .trim();
  } catch (err) {
    console.error("[ai] writeMessage failed:", err);
  }

  const latencyMs = Date.now() - t0;

  if (generated && generated.length > 2 && verifyFacts(generated, facts)) {
    return { text: generated, provider, modelId, latencyMs };
  }

  if (generated && generated.length > 2) {
    try {
      const r2 = await callModel(provider, messages);
      modelId = r2.modelId;
      const generated2 = r2.text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/^["']|["']$/g, "")
        .trim();
      if (generated2.length > 2 && verifyFacts(generated2, facts)) {
        return {
          text: generated2,
          provider,
          modelId,
          latencyMs: Date.now() - t0,
        };
      }
    } catch {
      // ignore
    }
  }

  return { text: fallback, provider: "rules", latencyMs };
}

function buildDefaultExplanation(facts: DecisionFacts): string {
  switch (facts.action) {
    case "skip_candidate":
      return (
        facts.skipReason ??
        `${facts.candidateName ?? "Candidate"} is not eligible for this shift.`
      );
    case "offer_sent":
      return `${facts.candidateName ?? "Candidate"} is the best available match (rank ${facts.rank ?? "?"}).`;
    case "split_plan_chosen":
      return `No single person can cover the full shift. Split plan: ${facts.splitParts ?? "2 parts"}.`;
    case "offer_accepted":
    case "part_accepted":
      return `${facts.candidateName ?? "Employee"} accepted the cover for ${facts.windowLabel ?? "the shift"}.`;
    case "offer_declined":
    case "part_declined":
      return `${facts.candidateName ?? "Employee"} declined. Moving to next candidate.`;
    case "auto_assigned":
      return `Shift covered automatically. ${facts.splitParts ?? ""}`;
    case "escalated":
      return "No feasible coverage plan found. Manager intervention required.";
    case "interpreted_call_out":
      return `Call-out detected (${facts.intent ?? "call_out"}, confidence ${((facts.confidence ?? 0) * 100).toFixed(0)}%).`;
    default:
      return `Agent action: ${facts.action}.`;
  }
}

export async function explainDecision(
  facts: DecisionFacts,
  providerOverride?: AiProvider,
): Promise<GraniteResult> {
  const provider = effectiveProvider(providerOverride);
  const defaultExplanation = buildDefaultExplanation(facts);

  if (provider === "rules") {
    return { text: defaultExplanation, provider: "rules", latencyMs: 0 };
  }

  const prompt = buildExplainDecisionPrompt(facts);
  const messages: ChatMessage[] = [
    { role: "system", content: "You are ShiftFix. Write one short sentence." },
    { role: "user", content: prompt },
  ];

  const t0 = Date.now();
  let generated: string | null = null;
  let modelId: string | undefined;

  try {
    const r = await callModel(provider, messages);
    modelId = r.modelId;
    generated = r.text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^["']|["']$/g, "")
      .trim();
    if (!generated || generated.length > 120) generated = null;
  } catch (err) {
    console.error("[ai] explainDecision failed:", err);
  }

  const latencyMs = Date.now() - t0;

  return {
    text: generated ?? defaultExplanation,
    provider: generated ? provider : "rules",
    modelId: generated ? modelId : undefined,
    latencyMs,
  };
}

export function needsClarification(result: InterpretResult): boolean {
  return result.confidence < CONFIDENCE_THRESHOLD;
}

export { CONFIDENCE_THRESHOLD };
export type { InterpretContext, MessageFacts, MessageKind, DecisionFacts };
