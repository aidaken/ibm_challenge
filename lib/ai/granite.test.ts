// ShiftFix — written by IBM Bob

import { describe, expect, it } from "vitest";
import { mockInterpret, needsClarification } from "@/lib/ai/granite";

describe("mockInterpret", () => {
  it("detects call-out, accept, and confirm", () => {
    expect(
      mockInterpret(
        "hey I'm not available for my Monday morning shift, can someone cover me?",
      ).intent,
    ).toBe("call_out");
    expect(mockInterpret("yes").intent).toBe("accept");
    expect(mockInterpret("confirm").intent).toBe("confirm");
  });

  it("flags low confidence as needing clarification", () => {
    const result = mockInterpret("hmm maybe later whatever");
    expect(needsClarification(result)).toBe(true);
  });
});
