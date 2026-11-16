// ShiftFix — written by IBM Bob

import { describe, expect, it } from "vitest";
import { findEligibleCandidates } from "@/lib/coverage/eligibility";
import { createSeedState, IDS } from "@/lib/db/seed";

describe("findEligibleCandidates", () => {
  it("skips Jordan (working + not barista) and keeps Arlo", () => {
    const state = createSeedState();
    const shift = state.shifts.find((s) => s.id === IDS.shiftAmandaMon)!;

    const result = findEligibleCandidates({
      shift,
      employees: state.employees,
      availability: state.availability,
      allShifts: state.shifts,
      excludeEmployeeIds: [IDS.amanda],
    });

    expect(result.eligible.map((c) => c.employee.id)).toEqual([IDS.arlo]);
    const jordanSkip = result.skipped.find((s) => s.employeeId === IDS.jordan);
    expect(jordanSkip?.reason).toMatch(/already working 9am-3pm/i);
    expect(jordanSkip?.reason).toMatch(/not barista trained/i);
  });
});
