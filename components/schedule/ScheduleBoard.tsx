// ShiftFix — written by IBM Bob

import type { DemoState } from "@/lib/types";
import { formatShiftWindow } from "@/lib/coverage/time";

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
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      data-testid="schedule-board"
    >
      <h2 className="text-lg font-semibold text-slate-900">Monday schedule</h2>
      <p className="mb-4 text-sm text-slate-500">Cafe floor — demo week</p>
      <ul className="space-y-3">
        {mondayShifts.map((shift) => {
          const person = byId.get(shift.employeeId);
          return (
            <li
              key={shift.id}
              data-testid={`shift-${shift.id}`}
              data-employee={person?.name ?? ""}
              data-status={shift.status}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900" data-testid="shift-employee">
                  {person?.name ?? "Unassigned"}
                </p>
                <p className="text-sm capitalize text-slate-600">
                  {shift.role} · {formatShiftWindow(shift.start, shift.end)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  shift.status === "covered"
                    ? "bg-teal-100 text-teal-800"
                    : shift.status === "needs_cover"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-200 text-slate-700"
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
