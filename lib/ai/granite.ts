// ShiftFix — written by IBM Bob
// Granite language client. watsonx | ollama | mock behind one interface.
// Granite handles LANGUAGE only — never eligibility or state changes.

import {
  CONFIDENCE_THRESHOLD,
  InterpreterResultSchema,
  type InterpreterResult,
} from "@/lib/ai/schemas";
import { buildInterpreterPrompt } from "@/lib/ai/prompts";

export type AiProvider = "watsonx" | "ollama" | "mock";

function resolveProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (raw === "watsonx" || raw === "ollama" || raw === "mock") {
    return raw;
  }
  return "mock";
}

/**
 * Deterministic local interpreter so the hackathon demo stays green without
 * watsonx/Ollama. Same Zod contract as the live Granite path.
 */
export function mockInterpret(message: string): InterpreterResult {
  const text = message.toLowerCase().trim();

  if (
    /\b(confirm|approved|approve|yes,? confirm)\b/.test(text) ||
    text === "confirm"
  ) {
    return { intent: "confirm", confidence: 0.95 };
  }
  if (
    /\b(can't|cannot|cant|not available|call.?out|sick|cover me|someone cover)\b/.test(
      text,
    )
  ) {
    return {
      intent: "call_out",
      shift_ref: "monday morning",
      confidence: 0.92,
    };
  }
  if (/^(yes|yep|yeah|i can|i'll take it|ill take it|sure)\b/.test(text)) {
    return { intent: "accept", confidence: 0.93 };
  }
  if (/^(no|nope|can't|cannot|pass|decline)\b/.test(text)) {
    return { intent: "decline", confidence: 0.9 };
  }
  if (/\?/.test(text)) {
    return { intent: "question", confidence: 0.75 };
  }
  return { intent: "other", confidence: 0.4 };
}

async function callOllama(prompt: string): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "granite3.3:8b";
  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { response?: string };
  return data.response ?? "";
}

async function callWatsonx(prompt: string): Promise<string> {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const url =
    process.env.WATSONX_URL ??
    "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-29";
  const modelId = process.env.WATSONX_MODEL_ID ?? "ibm/granite-3-8b-instruct";

  if (!apiKey || !projectId) {
    throw new Error("WATSONX_API_KEY and WATSONX_PROJECT_ID are required");
  }

  const tokenRes = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  });
  if (!tokenRes.ok) {
    throw new Error(`watsonx IAM error ${tokenRes.status}`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token: string };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model_id: modelId,
      project_id: projectId,
      input: prompt,
      parameters: {
        decoding_method: "greedy",
        max_new_tokens: 200,
        temperature: 0,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`watsonx error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    results?: Array<{ generated_text?: string }>;
  };
  return data.results?.[0]?.generated_text ?? "";
}

function parseInterpreterJson(raw: string): InterpreterResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { intent: "other", confidence: 0 };
  }
  try {
    const parsed: unknown = JSON.parse(match[0]);
    const result = InterpreterResultSchema.safeParse(parsed);
    if (!result.success) {
      return { intent: "other", confidence: 0 };
    }
    return result.data;
  } catch {
    return { intent: "other", confidence: 0 };
  }
}

export interface InterpretOptions {
  message: string;
  context?: string;
  /** Force a provider (tests). */
  provider?: AiProvider;
}

export async function interpretMessage(
  options: InterpretOptions,
): Promise<InterpreterResult> {
  const provider = options.provider ?? resolveProvider();
  const context = options.context ?? "Cafe team chat / DM.";

  if (provider === "mock") {
    return mockInterpret(options.message);
  }

  const prompt = buildInterpreterPrompt(options.message, context);
  try {
    const raw =
      provider === "watsonx"
        ? await callWatsonx(prompt)
        : await callOllama(prompt);
    return parseInterpreterJson(raw);
  } catch (err) {
    // Keep the demo alive if remote Granite is down — fall back to mock.
    console.error("[granite] provider failed, using mock:", err);
    return mockInterpret(options.message);
  }
}

export function needsClarification(result: InterpreterResult): boolean {
  return result.confidence < CONFIDENCE_THRESHOLD;
}

export { CONFIDENCE_THRESHOLD };
