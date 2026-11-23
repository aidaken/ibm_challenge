import { IDS } from "@/lib/db/seed";

export type CoachSection = "chats" | "schedule" | "audit";

export type CoachAction =
  | { type: "reset" }
  | { type: "section"; section: CoachSection }
  | { type: "persona"; employeeId: string }
  | { type: "openChat"; chatId: string }
  | { type: "send"; channel: "group" | "dm"; text: string; asEmployeeId: string }
  | { type: "fastForward" }
  | { type: "wait"; ms: number };

export interface CoachStep {
  id: string;
  label: string;
  hint?: string;
  /** Skipped by "Run this path" — judge can Do manually */
  optional?: boolean;
  actions: CoachAction[];
}

export interface CoachPath {
  id: string;
  title: string;
  /** Short judge-facing differentiator copy */
  blurb: string;
  stepIds: string[];
}

const CALL_OUT =
  "hey I'm not available for my Monday shift, can someone cover me?";

/** Bot typing delay in DemoApp — coach waits so UI catches up. */
export const COACH_BOT_WAIT_MS = 2000;

export const COACH_STEPS: CoachStep[] = [
  {
    id: "reset",
    label: "Reset demo",
    hint: "Clean seed — Amanda Mon 10am–6pm",
    actions: [{ type: "reset" }],
  },
  {
    id: "schedule-peek",
    label: "Peek schedule",
    hint: "Amanda is scheduled Monday",
    actions: [{ type: "section", section: "schedule" }],
  },
  {
    id: "call-out",
    label: "Amanda posts call-out",
    hint: "Team chat → ShiftFix plans a split",
    actions: [
      { type: "persona", employeeId: IDS.amanda },
      { type: "openChat", chatId: "group" },
      {
        type: "send",
        channel: "group",
        text: CALL_OUT,
        asEmployeeId: IDS.amanda,
      },
      { type: "wait", ms: COACH_BOT_WAIT_MS },
    ],
  },
  {
    id: "activity-split",
    label: "Show Agent Activity",
    hint: "Diff 1: split plan + skip reasons",
    actions: [{ type: "section", section: "audit" }],
  },
  {
    id: "maya-offer",
    label: "Open Maya’s offer DM",
    hint: "Morning part 10am–2pm",
    actions: [
      { type: "persona", employeeId: IDS.maya },
      { type: "openChat", chatId: IDS.maya },
    ],
  },
  {
    id: "maya-accept",
    label: "Maya accepts",
    hint: "Part 1 confirmed",
    actions: [
      { type: "persona", employeeId: IDS.maya },
      { type: "openChat", chatId: IDS.maya },
      { type: "send", channel: "dm", text: "yes", asEmployeeId: IDS.maya },
      { type: "wait", ms: COACH_BOT_WAIT_MS },
    ],
  },
  {
    id: "arlo-decline",
    label: "Arlo declines",
    hint: "Diff 2: agent replaces just that part",
    actions: [
      { type: "persona", employeeId: IDS.arlo },
      { type: "openChat", chatId: IDS.arlo },
      { type: "send", channel: "dm", text: "no", asEmployeeId: IDS.arlo },
      { type: "wait", ms: COACH_BOT_WAIT_MS },
    ],
  },
  {
    id: "timeout-alt",
    label: "Alt: Fast-forward timeout",
    hint: "Diff 2: use instead of Arlo decline (pending part expires)",
    optional: true,
    actions: [
      { type: "fastForward" },
      { type: "wait", ms: 800 },
      { type: "section", section: "audit" },
    ],
  },
  {
    id: "david-offer",
    label: "Open David’s offer DM",
    hint: "Afternoon replacement 2pm–6pm",
    actions: [
      { type: "persona", employeeId: IDS.david },
      { type: "openChat", chatId: IDS.david },
    ],
  },
  {
    id: "david-accept",
    label: "David accepts",
    hint: "Diff 3: auto-assign, no manager click",
    actions: [
      { type: "persona", employeeId: IDS.david },
      { type: "openChat", chatId: IDS.david },
      { type: "send", channel: "dm", text: "yes", asEmployeeId: IDS.david },
      { type: "wait", ms: COACH_BOT_WAIT_MS },
    ],
  },
  {
    id: "schedule-covered",
    label: "Schedule shows covered",
    hint: "Split · Maya + David",
    actions: [{ type: "section", section: "schedule" }],
  },
  {
    id: "sam-dm",
    label: "Sam’s manager DM",
    hint: "Diff 3: covered notice only",
    actions: [
      { type: "persona", employeeId: IDS.manager },
      { type: "openChat", chatId: IDS.manager },
    ],
  },
  {
    id: "activity-done",
    label: "Agent Activity timeline",
    hint: "Every decision + auto_assigned",
    actions: [{ type: "section", section: "audit" }],
  },
];

export const COACH_PATHS: CoachPath[] = [
  {
    id: "split",
    title: "1 · Split",
    blurb: "AI shift splitting when nobody can cover the whole window.",
    stepIds: ["reset", "schedule-peek", "call-out", "activity-split", "maya-offer"],
  },
  {
    id: "self-heal",
    title: "2 · Self-heal",
    blurb: "Declines and timeouts — agent replaces the part on its own.",
    stepIds: ["maya-accept", "arlo-decline", "timeout-alt", "david-offer"],
  },
  {
    id: "explained",
    title: "3 · Explained",
    blurb: "Zero manager work — auto-assign, Sam DM, full Activity trail.",
    stepIds: ["david-accept", "schedule-covered", "sam-dm", "activity-done"],
  },
];

export function getStep(id: string): CoachStep | undefined {
  return COACH_STEPS.find((s) => s.id === id);
}
