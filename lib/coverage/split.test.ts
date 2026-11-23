import { describe, expect, it } from "vitest";
import { computeSplitPlans, MIN_PART_HOURS } from "@/lib/coverage/split";
import { createSeedState, IDS } from "@/lib/db/seed";
import type { Shift } from "@/lib/types";

describe("computeSplitPlans", () => {
  it("finds a 2-person plan for Amanda's 10am-6pm shift (Maya 10-2, Arlo/David 2-6)", () => {
    const state = createSeedState();
    const shift = state.shifts.find((s) => s.id === IDS.shiftAmandaMon)!;

    const plans = computeSplitPlans({
      shift,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      excludeEmployeeIds: [IDS.amanda],
    });

    expect(plans.length).toBeGreaterThan(0);
    // Best plan should be 2 parts
    const best = plans[0];
    expect(best.parts.length).toBe(2);

    // Part 1 ends at or before 2pm; part 2 starts there
    const [partA, partB] = best.parts;
    expect(new Date(partA.startsAt).toISOString()).toBe(shift.start);
    expect(partA.endsAt).toBe(partB.startsAt);
    expect(new Date(partB.endsAt).toISOString()).toBe(shift.end);

    // No gaps/overlaps: each part >= MIN_PART_HOURS
    const aHours = (new Date(partA.endsAt).getTime() - new Date(partA.startsAt).getTime()) / 3_600_000;
    const bHours = (new Date(partB.endsAt).getTime() - new Date(partB.startsAt).getTime()) / 3_600_000;
    expect(aHours).toBeGreaterThanOrEqual(MIN_PART_HOURS);
    expect(bHours).toBeGreaterThanOrEqual(MIN_PART_HOURS);

    // Maya can cover 10am-2pm part (available 9am-2pm)
    const mayaInPartA = partA.candidates.some((c) => c.employee.id === IDS.maya);
    expect(mayaInPartA).toBe(true);
  });

  it("includes Arlo or David in the 2pm-6pm part", () => {
    const state = createSeedState();
    const shift = state.shifts.find((s) => s.id === IDS.shiftAmandaMon)!;

    const plans = computeSplitPlans({
      shift,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      excludeEmployeeIds: [IDS.amanda],
    });

    expect(plans.length).toBeGreaterThan(0);
    // Check if at the canonical split (10am-2pm / 2pm-6pm) Arlo or David appear in part B
    const twoHourPlan = plans.find(
      (p) =>
        p.parts.length === 2 &&
        p.parts[0].endsAt === "2026-11-16T14:00:00.000Z",
    );
    expect(twoHourPlan).toBeTruthy();
    if (twoHourPlan) {
      const partB = twoHourPlan.parts[1];
      const arloCovered = partB.candidates.some((c) => c.employee.id === IDS.arlo);
      const davidCovered = partB.candidates.some((c) => c.employee.id === IDS.david);
      expect(arloCovered || davidCovered).toBe(true);
    }
  });

  it("returns empty array when shift can't be split (no candidates at all)", () => {
    const state = createSeedState();
    // Use a shift with a role nobody has
    const impossibleShift: Shift = {
      id: "impossible",
      employeeId: IDS.amanda,
      role: "cashier",
      start: "2026-11-16T10:00:00.000Z",
      end: "2026-11-16T18:00:00.000Z",
      status: "needs_cover",
    };

    const plans = computeSplitPlans({
      shift: impossibleShift,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      // Exclude Jordan (the only cashier)
      excludeEmployeeIds: [IDS.amanda, IDS.jordan],
    });

    expect(plans.length).toBe(0);
  });

  it("MIN_PART_HOURS is 2", () => {
    expect(MIN_PART_HOURS).toBe(2);
  });
});
