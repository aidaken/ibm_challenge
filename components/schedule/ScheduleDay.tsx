"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { formatShiftWindow } from "@/lib/coverage/time";
import type { DemoState } from "@/lib/types";

interface Props {
  state: DemoState;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ScheduleDay({ state }: Props) {
  const monday = state.demoMondayIso;
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday],
  );
  const [dayIdx, setDayIdx] = useState(0); // Monday = index 0
  const ordered = week; // Mon..Sun (demoMondayIso is Monday)
  const selectedDate = ordered[dayIdx];

  const byId = new Map(state.employees.map((e) => [e.id, e]));
  const shifts = state.shifts
    .filter((s) => s.start.startsWith(selectedDate))
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <section className="flex h-full flex-col bg-[var(--surface)]" data-testid="schedule-board">
      <header className="border-b border-[var(--divider)] bg-white px-4 py-3">
        <h2 className="text-base font-bold text-[var(--ink)]">Schedule</h2>
        <p className="text-xs text-[var(--ink-muted)]">Cafe floor · demo week</p>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {ordered.map((date, i) => {
            const dow = new Date(`${date}T12:00:00.000Z`).getUTCDay();
            const active = i === dayIdx;
            return (
              <button
                key={date}
                type="button"
                data-testid={`day-chip-${DAYS[dow]}`}
                onClick={() => setDayIdx(i)}
                className={`min-h-11 min-w-11 shrink-0 rounded-full px-3 text-xs font-bold ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] ring-1 ring-[var(--divider)]"
                }`}
              >
                {DAYS[dow]}
              </button>
            );
          })}
        </div>
      </header>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {shifts.length === 0 ? (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-[var(--ink-muted)] ring-1 ring-[var(--divider)]">
            No shifts this day
          </li>
        ) : (
          shifts.map((shift) => {
            const person = byId.get(shift.employeeId);
            const parts = state.coverageParts
              .filter((p) => {
                const req = state.coverageRequests.find((r) => r.shiftId === shift.id);
                return req && p.requestId === req.id && p.assignedEmployeeId;
              })
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
            const isSplit = parts.length >= 2;

            return (
              <li
                key={shift.id}
                data-testid={`shift-${shift.id}`}
                data-employee={
                  isSplit
                    ? parts.map((p) => byId.get(p.assignedEmployeeId!)?.name ?? "").join("+")
                    : (person?.name ?? "")
                }
                data-status={shift.status}
                className="rounded-2xl bg-white p-3 ring-1 ring-[var(--divider)]"
              >
                {isSplit ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                        Split · {formatShiftWindow(shift.start, shift.end)}
                      </span>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                        covered
                      </span>
                    </div>
                    <div className="space-y-2">
                      {parts.map((part) => {
                        const partPerson = byId.get(part.assignedEmployeeId!);
                        return (
                          <div key={part.id} className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-2 py-2">
                            <Avatar name={partPerson?.name ?? "?"} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--ink)]">
                                {partPerson?.name ?? "?"}
                              </p>
                              <p className="text-xs text-[var(--ink-muted)]">
                                {formatShiftWindow(part.startsAt, part.endsAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar name={person?.name ?? "?"} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ink)]">{person?.name}</p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {formatShiftWindow(shift.start, shift.end)} · {shift.role}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[var(--ink-muted)]">
                      {shift.status}
                    </span>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

/** Keep old export name for imports */
export { ScheduleDay as ScheduleBoard };
