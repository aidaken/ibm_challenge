import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  transition,
} from "@/lib/coverage/stateMachine";

describe("coverage state machine", () => {
  it("follows the happy path (single cover)", () => {
    expect(transition("open", "start_offering")).toBe("offering");
    expect(transition("offering", "next_candidate")).toBe("offering");
    expect(transition("offering", "worker_accepts")).toBe("covered");
  });

  it("follows the split path", () => {
    expect(transition("open", "start_planning")).toBe("planning");
    expect(transition("planning", "start_offering")).toBe("offering");
    expect(transition("offering", "all_parts_covered")).toBe("covered");
  });

  it("escalates when exhausted", () => {
    expect(transition("open", "no_candidates")).toBe("escalated");
    expect(transition("offering", "exhausted")).toBe("escalated");
    expect(transition("planning", "no_candidates")).toBe("escalated");
  });

  it("rejects illegal transitions", () => {
    expect(() => transition("covered", "start_offering")).toThrow(
      InvalidTransitionError,
    );
  });
});
