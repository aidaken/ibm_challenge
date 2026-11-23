import { describe, expect, it } from "vitest";
import { findEligibleCandidates } from "@/lib/coverage/eligibility";
import { createSeedState, IDS } from "@/lib/db/seed";
import type { Shift } from "@/lib/types";

describe("findEligibleCandidates", () => {
  it("skips Jordan (not barista) and excludes Amanda for a full-day shift", () => {
    const state = createSeedState();
    // Use a 2pm-6pm block — Arlo and David are both available for this
    const partShift: Shift = {
      id: "test_part",
      employeeId: IDS.amanda,
      role: "barista",
      start: "2026-11-16T14:00:00.000Z",
      end: "2026-11-16T18:00:00.000Z",
      status: "needs_cover",
    };

    const result = findEligibleCandidates({
      shift: partShift,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      excludeEmployeeIds: [IDS.amanda],
    });

    const eligibleIds = result.eligible.map((c) => c.employee.id);
    expect(eligibleIds).toContain(IDS.arlo);
    expect(eligibleIds).toContain(IDS.david);
    expect(eligibleIds).not.toContain(IDS.amanda);
    expect(eligibleIds).not.toContain(IDS.jordan);

    const jordanSkip = result.skipped.find((s) => s.employeeId === IDS.jordan);
    expect(jordanSkip?.reason).toMatch(/not barista trained/i);
  });

  it("skips Jordan (working 9am-3pm + not barista trained)", () => {
    const state = createSeedState();
    // Jordan's cashier shift overlaps with 9am-3pm; also not barista trained
    const shift9to3: Shift = {
      id: "test_9to3",
      employeeId: IDS.amanda,
      role: "barista",
      start: "2026-11-16T09:00:00.000Z",
      end: "2026-11-16T15:00:00.000Z",
      status: "needs_cover",
    };

    const result = findEligibleCandidates({
      shift: shift9to3,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      excludeEmployeeIds: [IDS.amanda],
    });

    const jordanSkip = result.skipped.find((s) => s.employeeId === IDS.jordan);
    expect(jordanSkip?.reason).toMatch(/already working 9am-3pm/i);
    expect(jordanSkip?.reason).toMatch(/not barista trained/i);
  });

  it("skips Chris due to weekly hours cap", () => {
    const state = createSeedState();
    const fullShift: Shift = {
      id: "test_full",
      employeeId: IDS.amanda,
      role: "barista",
      start: "2026-11-16T10:00:00.000Z",
      end: "2026-11-16T18:00:00.000Z",
      status: "needs_cover",
    };

    const result = findEligibleCandidates({
      shift: fullShift,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      excludeEmployeeIds: [IDS.amanda],
    });

    const chrisSkip = result.skipped.find((s) => s.employeeId === IDS.chris);
    expect(chrisSkip?.reason).toMatch(/exceed weekly hours cap/i);
  });
});
