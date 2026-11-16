// ShiftFix — written by IBM Bob

import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  transition,
} from "@/lib/coverage/stateMachine";

describe("coverage state machine", () => {
  it("follows the happy path", () => {
    expect(transition("open", "start_offering")).toBe("offering");
    expect(transition("offering", "next_candidate")).toBe("offering");
    expect(transition("offering", "worker_accepts")).toBe("pending_approval");
    expect(transition("pending_approval", "manager_approves")).toBe("filled");
  });

  it("escalates when exhausted", () => {
    expect(transition("open", "no_candidates")).toBe("escalated");
    expect(transition("offering", "exhausted")).toBe("escalated");
  });

  it("rejects illegal transitions", () => {
    expect(() => transition("filled", "start_offering")).toThrow(
      InvalidTransitionError,
    );
  });
});
