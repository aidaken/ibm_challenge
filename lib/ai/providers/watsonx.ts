/**
 * watsonx.ai Granite chat adapter (server-side only).
 */

export interface WatsonxChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface IamTokenCache {
  token: string;
  expiresAtMs: number;
}

let iamCache: IamTokenCache | null = null;
const IAM_REFRESH_BUFFER_MS = 60_000;

async function getIamToken(apiKey: string): Promise<string> {
  const now = Date.now();
  if (iamCache && now < iamCache.expiresAtMs - IAM_REFRESH_BUFFER_MS) {
    return iamCache.token;
  }

  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    throw new Error(`watsonx IAM error ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  iamCache = {
    token: data.access_token,
    expiresAtMs: now + data.expires_in * 1000,
  };
  return data.access_token;
}

export function watsonxModelId(): string {
  return (
    process.env.GRANITE_MODEL_ID?.trim() ||
    process.env.WATSONX_MODEL_ID?.trim() ||
    "ibm/granite-3-3-8b-instruct"
  );
}

export async function callWatsonxChat(
  messages: WatsonxChatMessage[],
): Promise<{ text: string; modelId: string }> {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new Error("WATSONX_API_KEY and WATSONX_PROJECT_ID are required");
  }

  const baseUrl = process.env.WATSONX_URL ?? "https://us-south.ml.cloud.ibm.com";
  const origin = baseUrl.replace(/\/ml\/v1.*$/, "").replace(/\/$/, "");
  const url = `${origin}/ml/v1/text/chat?version=2024-10-08`;
  const modelId = watsonxModelId();
  const token = await getIamToken(apiKey);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model_id: modelId,
      project_id: projectId,
      messages,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    throw new Error(`watsonx error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return { text: data.choices?.[0]?.message?.content ?? "", modelId };
}
