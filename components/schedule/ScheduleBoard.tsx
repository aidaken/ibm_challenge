// ShiftFix — written by IBM Bob

import { Avatar } from "@/components/chat/Avatar";
import { formatShiftWindow } from "@/lib/coverage/time";
import type { DemoState } from "@/lib/types";

interface Props {
  state: DemoState;
}

export function ScheduleBoard({ state }: Props) {
  const byId = new Map(state.employees.map((e) => [e.id, e]));
  const mondayShifts = state.shifts
    .filter((s) => s.start.startsWith(state.demoMondayIso))
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <section
      className="overflow-hidden bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5 sm:rounded-2xl"
      data-testid="schedule-board"
    >
      <header className="border-b border-[var(--divider)] bg-[var(--surface)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--ink)]">Monday schedule</h2>
        <p className="text-xs text-[var(--ink-muted)]">Cafe floor · demo week</p>
      </header>
      <ul className="divide-y divide-[var(--divider)]">
        {mondayShifts.map((shift) => {
          const person = byId.get(shift.employeeId);
          return (
            <li
              key={shift.id}
              data-testid={`shift-${shift.id}`}
              data-employee={person?.name ?? ""}
              data-status={shift.status}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              <Avatar name={person?.name ?? "?"} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--ink)]" data-testid="shift-employee">
                  {person?.name ?? "Unassigned"}
                </p>
                <p className="text-sm capitalize text-[var(--ink-muted)]">
                  {shift.role} · {formatShiftWindow(shift.start, shift.end)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  shift.status === "covered"
                    ? "bg-teal-100 text-teal-800"
                    : shift.status === "needs_cover"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {shift.status.replace("_", " ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
