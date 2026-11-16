// ShiftFix — written by IBM Bob

import type { DemoState } from "@/lib/types";

interface Props {
  state: DemoState;
}

export function AuditLog({ state }: Props) {
  const events = [...state.auditEvents].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );

  return (
    <section
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      data-testid="audit-log"
    >
      <h2 className="text-lg font-semibold text-slate-900">Audit log</h2>
      <p className="mb-4 text-sm text-slate-500">Every coverage step, with reason</p>
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No events yet — run the demo flow.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              data-testid="audit-event"
              data-action={e.action}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">{e.action}</span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {e.actor}
                </span>
              </div>
              <p className="mt-0.5 text-slate-700">{e.reason}</p>
              <p className="mt-1 text-[11px] text-slate-400">{e.timestamp}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
