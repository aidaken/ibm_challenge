// ShiftFix — written by IBM Bob
// Coverage request transitions — the only place status may change.

import type { CoverageStatus } from "@/lib/types";

export type TransitionAction =
  | "start_offering"
  | "next_candidate"
  | "worker_accepts"
  | "manager_approves"
  | "manager_rejects"
  | "no_candidates"
  | "exhausted";

const ALLOWED: Record<CoverageStatus, Partial<Record<TransitionAction, CoverageStatus>>> = {
  open: {
    start_offering: "offering",
    no_candidates: "escalated",
  },
  offering: {
    next_candidate: "offering",
    worker_accepts: "pending_approval",
    exhausted: "escalated",
  },
  pending_approval: {
    manager_approves: "filled",
    manager_rejects: "offering",
    exhausted: "escalated",
  },
  filled: {},
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
  const next = ALLOWED[current][action];
  if (!next) {
    throw new InvalidTransitionError(current, action);
  }
  return next;
}

export function canTransition(
  current: CoverageStatus,
  action: TransitionAction,
): boolean {
  return Boolean(ALLOWED[current][action]);
}
