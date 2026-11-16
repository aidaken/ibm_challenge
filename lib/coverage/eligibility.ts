// ShiftFix — written by IBM Bob
// Pure eligibility checks — TypeScript decides, not Granite.

import type {
  AvailabilityWindow,
  Employee,
  RankingResult,
  Shift,
  SkipRecord,
} from "@/lib/types";
import {
  dayOfWeekUtc,
  hoursBetween,
  minutesOfDay,
  rangesOverlap,
  restGapHours,
} from "@/lib/coverage/time";

export const MIN_REST_HOURS = 10;

export interface EligibilityInput {
  shift: Shift;
  employees: Employee[];
  availability: AvailabilityWindow[];
  allShifts: Shift[];
  /** Exclude the call-out worker and the bot. */
  excludeEmployeeIds: string[];
}

function isTrained(employee: Employee, role: Shift["role"]): boolean {
  return employee.roles.includes(role);
}

function isFreeDuringShift(
  employee: Employee,
  shift: Shift,
  allShifts: Shift[],
): { free: boolean; conflictLabel?: string } {
  const conflicts = allShifts.filter(
    (s) =>
      s.employeeId === employee.id &&
      s.id !== shift.id &&
      s.status !== "cancelled" &&
      rangesOverlap(s.start, s.end, shift.start, shift.end),
  );
  if (conflicts.length > 0) {
    const c = conflicts[0];
    const start = minutesOfDay(c.start);
    const end = minutesOfDay(c.end);
    const label = formatLocalRange(start, end);
    return { free: false, conflictLabel: label };
  }
  return { free: true };
}

function formatLocalRange(startMinute: number, endMinute: number): string {
  const fmt = (m: number) => {
    let h = Math.floor(m / 60);
    const min = m % 60;
    const suffix = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    return min === 0 ? `${h}${suffix}` : `${h}:${String(min).padStart(2, "0")}${suffix}`;
  };
  return `${fmt(startMinute)}-${fmt(endMinute)}`;
}

function hasAvailabilityWindow(
  employee: Employee,
  shift: Shift,
  availability: AvailabilityWindow[],
): boolean {
  const day = dayOfWeekUtc(shift.start);
  const start = minutesOfDay(shift.start);
  const end = minutesOfDay(shift.end);
  return availability.some(
    (a) =>
      a.employeeId === employee.id &&
      a.dayOfWeek === day &&
      a.startMinute <= start &&
      a.endMinute >= end,
  );
}

function hoursThisWeek(employeeId: string, shift: Shift, allShifts: Shift[]): number {
  const weekStart = startOfUtcWeek(shift.start);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return allShifts
    .filter(
      (s) =>
        s.employeeId === employeeId &&
        s.status !== "cancelled" &&
        new Date(s.start) >= weekStart &&
        new Date(s.start) < weekEnd,
    )
    .reduce((sum, s) => sum + hoursBetween(s.start, s.end), 0);
}

function startOfUtcWeek(iso: string): Date {
  const d = new Date(iso);
  const day = d.getUTCDay();
  // Demo week starts Monday (ISO). Convert Sunday=0 → Monday-based.
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff),
  );
  return monday;
}

function hasMinRest(
  employee: Employee,
  shift: Shift,
  allShifts: Shift[],
): { ok: boolean; gapHours?: number } {
  const others = allShifts.filter(
    (s) =>
      s.employeeId === employee.id &&
      s.id !== shift.id &&
      s.status !== "cancelled",
  );
  for (const other of others) {
    const gap = restGapHours(other.start, other.end, shift.start, shift.end);
    if (gap < MIN_REST_HOURS) {
      return { ok: false, gapHours: gap };
    }
  }
  return { ok: true };
}

/**
 * Eligible = free during the shift AND trained for the role AND under weekly
 * hours cap AND minimum rest gap. Call-out worker and managers/bots excluded.
 */
export function findEligibleCandidates(input: EligibilityInput): RankingResult {
  const shiftHours = hoursBetween(input.shift.start, input.shift.end);
  const skipped: SkipRecord[] = [];
  const eligible: RankingResult["eligible"] = [];

  for (const employee of input.employees) {
    if (input.excludeEmployeeIds.includes(employee.id)) continue;
    if (employee.isManager || employee.isBot) continue;

    const trained = isTrained(employee, input.shift.role);
    const free = isFreeDuringShift(employee, input.shift, input.allShifts);
    // Combine common demo skip reasons into one human-readable line.
    if (!trained && !free.free) {
      skipped.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: `${employee.name}: already working ${free.conflictLabel}, not ${input.shift.role} trained`,
      });
      continue;
    }
    if (!trained) {
      skipped.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: `${employee.name}: not ${input.shift.role} trained`,
      });
      continue;
    }
    if (!free.free) {
      skipped.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: `${employee.name}: already working ${free.conflictLabel}, not free for cover`,
      });
      continue;
    }

    if (!hasAvailabilityWindow(employee, input.shift, input.availability)) {
      skipped.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: `${employee.name}: not marked available during the shift window`,
      });
      continue;
    }

    const weekHours = hoursThisWeek(employee.id, input.shift, input.allShifts);
    if (weekHours + shiftHours > employee.maxWeeklyHours) {
      skipped.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: `${employee.name}: would exceed weekly hours cap (${weekHours}+${shiftHours} > ${employee.maxWeeklyHours})`,
      });
      continue;
    }

    const rest = hasMinRest(employee, input.shift, input.allShifts);
    if (!rest.ok) {
      skipped.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: `${employee.name}: rest gap only ${rest.gapHours?.toFixed(1)}h (need ${MIN_REST_HOURS}h)`,
      });
      continue;
    }

    eligible.push({
      employee,
      hoursThisWeek: weekHours,
      lastPickupAt: employee.lastPickupAt,
    });
  }

  return { eligible, skipped };
}
