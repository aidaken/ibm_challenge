// ShiftFix — written by IBM Bob
// Pure ranking — fewest hours this week, then least recent pickup.

import type { RankingCandidate } from "@/lib/types";

/**
 * Sort eligible candidates: fewest hours this week first, then who picked up
 * least recently (null = never = highest priority among ties).
 */
export function rankCandidates(candidates: RankingCandidate[]): RankingCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.hoursThisWeek !== b.hoursThisWeek) {
      return a.hoursThisWeek - b.hoursThisWeek;
    }
    const aPickup = a.lastPickupAt ? Date.parse(a.lastPickupAt) : 0;
    const bPickup = b.lastPickupAt ? Date.parse(b.lastPickupAt) : 0;
    if (aPickup !== bPickup) {
      return aPickup - bPickup;
    }
    return a.employee.name.localeCompare(b.employee.name);
  });
}
