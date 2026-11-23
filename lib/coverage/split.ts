// Pure shift-splitting functions — TypeScript decides plans, never Granite.
// Finds 2-person or 3-person split plans that together cover a time block
// with no gaps and no overlaps. Each part must be at least MIN_PART_HOURS.

import type {
  AvailabilityWindow,
  Employee,
  RankingCandidate,
  Shift,
} from "@/lib/types";
import { findEligibleCandidates } from "@/lib/coverage/eligibility";
import { rankCandidates } from "@/lib/coverage/ranking";

export const MIN_PART_HOURS = 2;

export interface SplitPart {
  startsAt: string;
  endsAt: string;
  candidates: RankingCandidate[];  // ranked, non-empty
}

export interface SplitPlan {
  parts: SplitPart[];
}

interface SplitInput {
  shift: Shift;
  employees: Employee[];
  availability: AvailabilityWindow[];
  allShifts: Shift[];
  excludeEmployeeIds: string[];
}

/** Returns all candidate split points (ISO strings) between start and end that are multiples of 30 min. */
function splitPoints(startIso: string, endIso: string): string[] {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const step = 30 * 60 * 1000;
  const minPart = MIN_PART_HOURS * 60 * 60 * 1000;
  const points: string[] = [];
  for (let t = start + minPart; t <= end - minPart; t += step) {
    points.push(new Date(t).toISOString());
  }
  return points;
}

function makePartShift(base: Shift, startIso: string, endIso: string): Shift {
  return { ...base, id: `split_${startIso}_${endIso}`, start: startIso, end: endIso };
}

function getPartCandidates(
  partShift: Shift,
  input: SplitInput,
  excludeIds: string[],
): RankingCandidate[] {
  const result = findEligibleCandidates({
    shift: partShift,
    employees: input.employees,
    availability: input.availability,
    allShifts: input.allShifts,
    excludeEmployeeIds: [...input.excludeEmployeeIds, ...excludeIds],
  });
  return rankCandidates(result.eligible);
}

/** Try to find valid 2-person split plans covering [startIso, endIso]. */
function twoPersonPlans(input: SplitInput, startIso: string, endIso: string): SplitPlan[] {
  const points = splitPoints(startIso, endIso);
  const plans: SplitPlan[] = [];

  for (const mid of points) {
    const partA = makePartShift(input.shift, startIso, mid);
    const partB = makePartShift(input.shift, mid, endIso);
    const aList = getPartCandidates(partA, input, []);
    if (aList.length === 0) continue;
    // Exclude people assigned to part A from part B
    const aExclude = aList.map((c) => c.employee.id);
    const bList = getPartCandidates(partB, input, aExclude);
    if (bList.length === 0) continue;

    plans.push({
      parts: [
        { startsAt: startIso, endsAt: mid, candidates: aList },
        { startsAt: mid, endsAt: endIso, candidates: bList },
      ],
    });
  }

  return plans;
}

/** Try to find valid 3-person split plans covering [startIso, endIso]. */
function threePersonPlans(input: SplitInput, startIso: string, endIso: string): SplitPlan[] {
  const outerPoints = splitPoints(startIso, endIso);
  const plans: SplitPlan[] = [];

  for (const mid1 of outerPoints) {
    const innerPoints = splitPoints(mid1, endIso);
    for (const mid2 of innerPoints) {
      const partA = makePartShift(input.shift, startIso, mid1);
      const partB = makePartShift(input.shift, mid1, mid2);
      const partC = makePartShift(input.shift, mid2, endIso);

      const aList = getPartCandidates(partA, input, []);
      if (aList.length === 0) continue;
      const aExclude = aList.map((c) => c.employee.id);
      const bList = getPartCandidates(partB, input, aExclude);
      if (bList.length === 0) continue;
      const abExclude = [...aExclude, ...bList.map((c) => c.employee.id)];
      const cList = getPartCandidates(partC, input, abExclude);
      if (cList.length === 0) continue;

      plans.push({
        parts: [
          { startsAt: startIso, endsAt: mid1, candidates: aList },
          { startsAt: mid1, endsAt: mid2, candidates: bList },
          { startsAt: mid2, endsAt: endIso, candidates: cList },
        ],
      });
    }
  }

  return plans;
}

/**
 * Compute all feasible split plans for a time block.
 * Returns 2-person plans first, then 3-person. Within each group,
 * the best combined ranking (lowest rank sum of top candidates) comes first.
 * Returns [] if no feasible plan exists.
 */
export function computeSplitPlans(
  input: SplitInput,
  startIso: string = input.shift.start,
  endIso: string = input.shift.end,
): SplitPlan[] {
  const two = twoPersonPlans(input, startIso, endIso);
  if (two.length > 0) {
    return sortByRankSum(two);
  }
  const three = threePersonPlans(input, startIso, endIso);
  return sortByRankSum(three);
}

function rankSum(plan: SplitPlan): number {
  return plan.parts.reduce((sum, p) => sum + (p.candidates[0]?.hoursThisWeek ?? 999), 0);
}

function sortByRankSum(plans: SplitPlan[]): SplitPlan[] {
  return [...plans].sort((a, b) => rankSum(a) - rankSum(b));
}
