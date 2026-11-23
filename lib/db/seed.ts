// Fake cafe seed: Amanda, Arlo, Maya, David, Chris, Jordan, Sam, ShiftFix bot.

import type { DemoState } from "@/lib/types";

export const IDS = {
  amanda: "emp_amanda",
  arlo: "emp_arlo",
  maya: "emp_maya",
  david: "emp_david",
  chris: "emp_chris",
  jordan: "emp_jordan",
  manager: "emp_manager",
  shiftfix: "emp_shiftfix",
  shiftAmandaMon: "shift_amanda_mon",
  shiftJordanMon: "shift_jordan_mon",
} as const;

/** Fixed demo Monday so Playwright stays deterministic. */
export const DEMO_MONDAY = "2026-11-16"; // Monday

function isoAt(day: string, hour: number, minute = 0): string {
  return `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

export function createSeedState(nowIso = `${DEMO_MONDAY}T08:00:00.000Z`): DemoState {
  return {
    nowIso,
    demoMondayIso: DEMO_MONDAY,
    employees: [
      {
        id: IDS.amanda,
        name: "Amanda",
        roles: ["barista"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: null,
      },
      {
        id: IDS.arlo,
        name: "Arlo",
        roles: ["barista"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: null,
      },
      {
        id: IDS.maya,
        name: "Maya",
        roles: ["barista"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: null,
      },
      {
        id: IDS.david,
        name: "David",
        roles: ["barista"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: null,
      },
      {
        id: IDS.chris,
        name: "Chris",
        roles: ["barista"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: null,
      },
      {
        id: IDS.jordan,
        name: "Jordan",
        roles: ["cashier"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: "2026-11-10T12:00:00.000Z",
      },
      {
        id: IDS.manager,
        name: "Sam",
        roles: ["manager"],
        maxWeeklyHours: 60,
        isManager: true,
        lastPickupAt: null,
      },
      {
        id: IDS.shiftfix,
        name: "ShiftFix",
        roles: ["manager"],
        maxWeeklyHours: 0,
        isManager: false,
        isBot: true,
        lastPickupAt: null,
      },
    ],
    availability: [
      // Amanda: Mon 10am-6pm
      {
        id: "av_amanda_mon",
        employeeId: IDS.amanda,
        dayOfWeek: 1,
        startMinute: 10 * 60,
        endMinute: 18 * 60,
      },
      // Arlo: Mon 2pm-8pm only
      {
        id: "av_arlo_mon",
        employeeId: IDS.arlo,
        dayOfWeek: 1,
        startMinute: 14 * 60,
        endMinute: 20 * 60,
      },
      // Maya: Mon 9am-2pm only
      {
        id: "av_maya_mon",
        employeeId: IDS.maya,
        dayOfWeek: 1,
        startMinute: 9 * 60,
        endMinute: 14 * 60,
      },
      // David: Mon 2pm-6pm
      {
        id: "av_david_mon",
        employeeId: IDS.david,
        dayOfWeek: 1,
        startMinute: 14 * 60,
        endMinute: 18 * 60,
      },
      // Chris: all day Monday
      {
        id: "av_chris_mon",
        employeeId: IDS.chris,
        dayOfWeek: 1,
        startMinute: 0,
        endMinute: 24 * 60,
      },
      // Jordan: Mon 9am-3pm
      {
        id: "av_jordan_mon",
        employeeId: IDS.jordan,
        dayOfWeek: 1,
        startMinute: 9 * 60,
        endMinute: 15 * 60,
      },
    ],
    shifts: [
      // Amanda: Mon 10am-6pm barista (8h shift — the one being covered)
      {
        id: IDS.shiftAmandaMon,
        employeeId: IDS.amanda,
        role: "barista",
        start: isoAt(DEMO_MONDAY, 10),
        end: isoAt(DEMO_MONDAY, 18),
        status: "scheduled",
      },
      // Jordan: Mon 9am-3pm cashier
      {
        id: IDS.shiftJordanMon,
        employeeId: IDS.jordan,
        role: "cashier",
        start: isoAt(DEMO_MONDAY, 9),
        end: isoAt(DEMO_MONDAY, 15),
        status: "scheduled",
      },
      // Chris: 38h already scheduled this week (Tue–Sat Nov 17-22, same week as Amanda's Mon Nov 16 shift).
      // Adding Amanda's 8h shift would push him to 46h > 40h cap.
      {
        id: "shift_chris_tue",
        employeeId: IDS.chris,
        role: "barista",
        start: "2026-11-17T09:00:00.000Z",
        end: "2026-11-17T17:00:00.000Z",
        status: "scheduled",
      },
      {
        id: "shift_chris_wed",
        employeeId: IDS.chris,
        role: "barista",
        start: "2026-11-18T09:00:00.000Z",
        end: "2026-11-18T17:00:00.000Z",
        status: "scheduled",
      },
      {
        id: "shift_chris_thu",
        employeeId: IDS.chris,
        role: "barista",
        start: "2026-11-19T09:00:00.000Z",
        end: "2026-11-19T17:00:00.000Z",
        status: "scheduled",
      },
      {
        id: "shift_chris_fri",
        employeeId: IDS.chris,
        role: "barista",
        start: "2026-11-20T09:00:00.000Z",
        end: "2026-11-20T16:00:00.000Z",
        status: "scheduled",
      },
      {
        id: "shift_chris_sat",
        employeeId: IDS.chris,
        role: "barista",
        start: "2026-11-21T10:00:00.000Z",
        end: "2026-11-21T17:00:00.000Z",
        status: "scheduled",
      },
    ],
    coverageRequests: [],
    coverageParts: [],
    offers: [],
    messages: [
      {
        id: "msg_welcome",
        channel: "group",
        dmPeerId: null,
        senderId: IDS.shiftfix,
        text: "ShiftFix is online. Post a call-out here and I'll find cover.",
        graniteIntent: null,
        confidence: null,
        createdAt: isoAt(DEMO_MONDAY, 7, 30),
      },
    ],
    auditEvents: [],
  };
}
