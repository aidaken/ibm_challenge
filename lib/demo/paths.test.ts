import { describe, expect, it } from "vitest";
import { COACH_PATHS, COACH_STEPS, getStep } from "@/lib/demo/paths";

describe("demo coach paths", () => {
  it("every path step id resolves", () => {
    for (const path of COACH_PATHS) {
      for (const id of path.stepIds) {
        expect(getStep(id), `missing step ${id} in ${path.id}`).toBeTruthy();
      }
    }
  });

  it("has three differentiator paths", () => {
    expect(COACH_PATHS.map((p) => p.id)).toEqual([
      "split",
      "self-heal",
      "explained",
    ]);
    expect(COACH_STEPS.length).toBeGreaterThanOrEqual(10);
  });
});
