import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  explainDecision,
  interpretMessage,
  mockInterpret,
  needsClarification,
  writeMessage,
} from "@/lib/ai/granite";
import { resetAiCallCount, tryReserveAiCall, getMaxAiCallsPerSession } from "@/lib/ai/sessionCap";

describe("mockInterpret (rules interpreter)", () => {
  it("detects call_out", () => {
    expect(
      mockInterpret(
        "hey I'm not available for my Monday morning shift, can someone cover me?",
      ).intent,
    ).toBe("call_out");
  });

  it("detects accept", () => {
    expect(mockInterpret("yes").intent).toBe("accept");
    expect(mockInterpret("sure").intent).toBe("accept");
  });

  it("detects decline", () => {
    expect(mockInterpret("no").intent).toBe("decline");
    expect(mockInterpret("nope, pass").intent).toBe("decline");
  });

  it("detects partial_availability", () => {
    expect(mockInterpret("i can only do till 2pm").intent).toBe("partial_availability");
    expect(mockInterpret("available from 10am").intent).toBe("partial_availability");
  });

  it("detects question", () => {
    expect(mockInterpret("what time is the shift?").intent).toBe("question");
  });

  it("flags low confidence as needing clarification", () => {
    const interpretation = mockInterpret("hmm maybe later whatever");
    const result = { ...interpretation, provider: "rules" as const, latencyMs: 0 };
    expect(needsClarification(result)).toBe(true);
  });
});

const BASE_CTX = {
  senderName: "Amanda",
  senderRole: "barista",
  channel: "group" as const,
  hasOpenOffer: false,
  upcomingShifts: "Monday 10am-6pm barista",
};

describe("interpretMessage (rules provider — no fetch)", () => {
  it("returns rules provider without calling fetch", async () => {
    const spy = vi.spyOn(global, "fetch");
    const result = await interpretMessage({
      message: "hey can someone cover my Monday shift",
      context: BASE_CTX,
      provider: "rules",
    });
    expect(result.intent).toBe("call_out");
    expect(result.provider).toBe("rules");
    expect(result.latencyMs).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("interpretMessage (bob provider — mocked fetch)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.BOB_API_KEY = "test-key";
    process.env.BOB_MODEL_ID = "premium";
    resetAiCallCount();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BOB_API_KEY;
    delete process.env.BOB_TEAM_ID;
    delete process.env.BOB_INFERENCE_URL;
    delete process.env.BOB_MODEL_ID;
  });

  it("parses valid JSON from bob response", async () => {
    const payload = { intent: "accept", confidence: 0.93 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }),
    });

    const result = await interpretMessage({
      message: "yes",
      context: BASE_CTX,
      provider: "bob",
    });
    expect(result.intent).toBe("accept");
    expect(result.provider).toBe("bob");
    expect(result.modelId).toBe("premium");
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers["User-Agent"]).toBe("bobshell/2.0");
    expect(init.headers["x-team-id"]).toBeUndefined();
  });

  it("falls back to rules when bob keys missing", async () => {
    delete process.env.BOB_API_KEY;
    const spy = vi.spyOn(global, "fetch");
    const result = await interpretMessage({
      message: "can't make my shift",
      context: BASE_CTX,
      provider: "bob",
    });
    expect(result.provider).toBe("rules");
    expect(result.intent).toBe("call_out");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("retries once on bad parse, then falls back to rules", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not json" } }],
      }),
    });

    const result = await interpretMessage({
      message: "i can't make it today",
      context: BASE_CTX,
      provider: "bob",
    });
    expect(result.provider).toBe("rules");
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });
});

describe("interpretMessage (watsonx provider — mocked fetch)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.WATSONX_API_KEY = "wx-key";
    process.env.WATSONX_PROJECT_ID = "proj-1";
    process.env.GRANITE_MODEL_ID = "ibm/granite-3-3-8b-instruct";
    resetAiCallCount();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WATSONX_API_KEY;
    delete process.env.WATSONX_PROJECT_ID;
    delete process.env.GRANITE_MODEL_ID;
  });

  it("uses IAM + chat completions and returns model id", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ intent: "decline", confidence: 0.9 }),
              },
            },
          ],
        }),
      });

    const result = await interpretMessage({
      message: "nope",
      context: BASE_CTX,
      provider: "watsonx",
    });
    expect(result.intent).toBe("decline");
    expect(result.provider).toBe("watsonx");
    expect(result.modelId).toBe("ibm/granite-3-3-8b-instruct");
  });
});

describe("session call cap", () => {
  beforeEach(() => {
    resetAiCallCount();
    process.env.AI_MAX_CALLS_PER_SESSION = "2";
  });
  afterEach(() => {
    delete process.env.AI_MAX_CALLS_PER_SESSION;
    resetAiCallCount();
  });

  it("blocks after max calls", () => {
    expect(getMaxAiCallsPerSession()).toBe(2);
    expect(tryReserveAiCall()).toBe(true);
    expect(tryReserveAiCall()).toBe(true);
    expect(tryReserveAiCall()).toBe(false);
  });
});

describe("writeMessage / explainDecision (rules)", () => {
  it("produces offer_dm with candidate and day info", async () => {
    const result = await writeMessage(
      {
        kind: "offer_dm",
        candidateName: "Arlo",
        callOutName: "Amanda",
        dayLabel: "Monday",
        windowLabel: "2pm to 6pm",
      },
      "rules",
    );
    expect(result.text.toLowerCase()).toContain("arlo");
    expect(result.provider).toBe("rules");
  });

  it("explainDecision returns text for split_plan_chosen", async () => {
    const result = await explainDecision(
      { action: "split_plan_chosen", splitParts: "2 parts: 10am-2pm, 2pm-6pm" },
      "rules",
    );
    expect(result.text.length).toBeGreaterThan(2);
  });
});
