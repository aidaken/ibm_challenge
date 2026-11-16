// ShiftFix — written by IBM Bob
// Fake cafe seed: Amanda, Arlo, Jordan, Manager + ShiftFix bot.

import type { DemoState } from "@/lib/types";

export const IDS = {
  amanda: "emp_amanda",
  arlo: "emp_arlo",
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
        id: IDS.jordan,
        name: "Jordan",
        roles: ["cashier"],
        maxWeeklyHours: 40,
        isManager: false,
        lastPickupAt: "2026-11-10T12:00:00.000Z",
      },
      {
        id: IDS.manager,
        name: "Manager",
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
      // Amanda works Mon 11–5 (seeded as availability matching her shift)
      {
        id: "av_amanda_mon",
        employeeId: IDS.amanda,
        dayOfWeek: 1,
        startMinute: 11 * 60,
        endMinute: 17 * 60,
      },
      // Arlo free all Monday
      {
        id: "av_arlo_mon",
        employeeId: IDS.arlo,
        dayOfWeek: 1,
        startMinute: 0,
        endMinute: 24 * 60,
      },
      // Jordan works Mon 9–3
      {
        id: "av_jordan_mon",
        employeeId: IDS.jordan,
        dayOfWeek: 1,
        startMinute: 9 * 60,
        endMinute: 15 * 60,
      },
    ],
    shifts: [
      {
        id: IDS.shiftAmandaMon,
        employeeId: IDS.amanda,
        role: "barista",
        start: isoAt(DEMO_MONDAY, 11),
        end: isoAt(DEMO_MONDAY, 17),
        status: "scheduled",
      },
      {
        id: IDS.shiftJordanMon,
        employeeId: IDS.jordan,
        role: "cashier",
        start: isoAt(DEMO_MONDAY, 9),
        end: isoAt(DEMO_MONDAY, 15),
        status: "scheduled",
      },
    ],
    coverageRequests: [],
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
