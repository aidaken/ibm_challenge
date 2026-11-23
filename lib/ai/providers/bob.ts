/**
 * IBM Bob inference adapter.
 * Keys stay server-side only (BOB_API_KEY). Never import this from client components.
 *
 * Auth: Authorization: Apikey <key>
 * Inference-scoped keys do not need x-team-id; General keys do (set BOB_TEAM_ID).
 * Cloudflare requires a bobshell User-Agent on the inference host.
 */

export interface BobChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface BobCallResult {
  text: string;
  modelId: string;
}

const DEFAULT_INFERENCE_URL =
  "https://api.us-east.bob.ibm.com/inference/v1/chat/completions";

/** Live Bob aliases from /inference/v1/model/info (e.g. premium, fast). */
const DEFAULT_MODEL_ID = "premium";

export function bobConfigStatus(): {
  ready: boolean;
  missing: string[];
  modelId: string;
  url: string;
  teamId?: string;
} {
  const missing: string[] = [];
  if (!process.env.BOB_API_KEY?.trim()) missing.push("BOB_API_KEY");

  const modelId = process.env.BOB_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const url = process.env.BOB_INFERENCE_URL?.trim() || DEFAULT_INFERENCE_URL;
  const teamId = process.env.BOB_TEAM_ID?.trim() || undefined;

  return { ready: missing.length === 0, missing, modelId, url, teamId };
}

/**
 * Calls Bob chat completions. Throws on HTTP / network errors.
 */
export async function callBobChat(
  messages: BobChatMessage[],
  options?: { timeoutMs?: number },
): Promise<BobCallResult> {
  const cfg = bobConfigStatus();
  if (!cfg.ready) {
    throw new Error(
      `[bob] missing env: ${cfg.missing.join(", ")} — falling back to rules`,
    );
  }

  const apiKey = process.env.BOB_API_KEY!.trim();
  const timeoutMs = options?.timeoutMs ?? 8_000;

  const headers: Record<string, string> = {
    Authorization: `Apikey ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    // Required to pass Bob edge / Cloudflare; matches Bob Shell clients.
    "User-Agent": "bobshell/2.0",
  };
  if (cfg.teamId) {
    headers["x-team-id"] = cfg.teamId;
  }

  const body = {
    model: cfg.modelId,
    messages,
    max_tokens: 300,
    temperature: 0,
  };

  const res = await fetch(cfg.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[bob] HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, modelId: cfg.modelId };
}
