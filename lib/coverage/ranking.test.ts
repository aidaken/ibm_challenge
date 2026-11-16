// ShiftFix — written by IBM Bob

import { describe, expect, it } from "vitest";
import { rankCandidates } from "@/lib/coverage/ranking";
import type { Employee, RankingCandidate } from "@/lib/types";

function emp(partial: Partial<Employee> & Pick<Employee, "id" | "name">): Employee {
  return {
    roles: ["barista"],
    maxWeeklyHours: 40,
    isManager: false,
    lastPickupAt: null,
    ...partial,
  };
}

describe("rankCandidates", () => {
  it("sorts by fewest hours, then least recent pickup", () => {
    const a: RankingCandidate = {
      employee: emp({ id: "a", name: "A", lastPickupAt: "2026-11-01T00:00:00.000Z" }),
      hoursThisWeek: 10,
      lastPickupAt: "2026-11-01T00:00:00.000Z",
    };
    const b: RankingCandidate = {
      employee: emp({ id: "b", name: "B", lastPickupAt: null }),
      hoursThisWeek: 4,
      lastPickupAt: null,
    };
    const c: RankingCandidate = {
      employee: emp({ id: "c", name: "C", lastPickupAt: "2026-10-01T00:00:00.000Z" }),
      hoursThisWeek: 10,
      lastPickupAt: "2026-10-01T00:00:00.000Z",
    };

    const ranked = rankCandidates([a, b, c]);
    expect(ranked.map((r) => r.employee.id)).toEqual(["b", "c", "a"]);
  });
});
