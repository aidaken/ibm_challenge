// Coverage request transitions — the only place status may change.

import type { CoverageStatus } from "@/lib/types";

export type TransitionAction =
  | "start_planning"
  | "start_offering"
  | "next_candidate"
  | "worker_accepts"
  | "split_needed"
  | "all_parts_covered"
  | "no_candidates"
  | "exhausted";

const ALLOWED: Record<CoverageStatus, Partial<Record<TransitionAction, CoverageStatus>>> = {
  open: {
    start_planning: "planning",
    start_offering: "offering",
    no_candidates: "escalated",
  },
  planning: {
    start_offering: "offering",
    no_candidates: "escalated",
  },
  offering: {
    next_candidate: "offering",
    worker_accepts: "covered",
    split_needed: "planning",
    all_parts_covered: "covered",
    exhausted: "escalated",
  },
  covered: {},
  filled: {},    // treated the same as covered
  escalated: {},
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: CoverageStatus,
    public readonly action: TransitionAction,
  ) {
    super(`Invalid coverage transition: ${from} + ${action}`);
    this.name = "InvalidTransitionError";
  }
}

/** Returns the next status or throws if the transition is not allowed. */
export function transition(
  current: CoverageStatus,
  action: TransitionAction,
): CoverageStatus {
  const next = ALLOWED[current]?.[action];
  if (!next) {
    throw new InvalidTransitionError(current, action);
  }
  return next;
}

export function canTransition(
  current: CoverageStatus,
  action: TransitionAction,
): boolean {
  return Boolean(ALLOWED[current]?.[action]);
}
