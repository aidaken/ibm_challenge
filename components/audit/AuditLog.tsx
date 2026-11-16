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
      className="overflow-hidden bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5 sm:rounded-2xl"
      data-testid="audit-log"
    >
      <header className="border-b border-[var(--divider)] bg-[var(--surface)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--ink)]">Audit log</h2>
        <p className="text-xs text-[var(--ink-muted)]">Every coverage step, with reason</p>
      </header>
      {events.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
          No events yet — run the demo flow.
        </p>
      ) : (
        <ol className="divide-y divide-[var(--divider)]">
          {events.map((e, i) => (
            <li
              key={e.id}
              data-testid="audit-event"
              data-action={e.action}
              className="flex gap-3 px-4 py-3 text-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--crew-blue)] text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--ink)]">{e.action}</span>
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                    {e.actor}
                  </span>
                </div>
                <p className="mt-0.5 text-[var(--ink)]">{e.reason}</p>
                <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{e.timestamp}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
