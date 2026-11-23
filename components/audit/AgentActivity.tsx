// Agent Activity timeline — shows every decision, skip reason, and assignment.
// This is a key judge-facing screen.

import type { DemoState } from "@/lib/types";

interface Props {
  state: DemoState;
  /** Side panel copy — uses a different testid so e2e stays unique */
  panel?: boolean;
}

const ACTION_ICONS: Record<string, string> = {
  call_out: "📢",
  interpreted_call_out: "🧠",
  skip_candidate: "⏭",
  offer_sent: "📨",
  split_plan_chosen: "✂️",
  split_offer_sent: "📨",
  offer_accepted: "✅",
  part_accepted: "✅",
  offer_declined: "❌",
  part_declined: "❌",
  offer_timed_out: "⏱",
  auto_assigned: "🏷",
  escalated: "🚨",
};

const ACTION_COLORS: Record<string, string> = {
  call_out: "#f59e0b",
  interpreted_call_out: "#8b5cf6",
  skip_candidate: "#6b7280",
  offer_sent: "#3b82f6",
  split_plan_chosen: "#0d9488",
  split_offer_sent: "#3b82f6",
  offer_accepted: "#10b981",
  part_accepted: "#10b981",
  offer_declined: "#ef4444",
  part_declined: "#ef4444",
  offer_timed_out: "#f97316",
  auto_assigned: "#10b981",
  escalated: "#dc2626",
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function actorBadge(actor: string): string {
  if (actor === "agent") return "AI";
  if (actor === "manager") return "Mgr";
  return "Worker";
}

function actorColor(actor: string): string {
  if (actor === "agent") return "#0d9488";
  if (actor === "manager") return "#7c3aed";
  return "#0d9488";
}

export function AgentActivity({ state, panel = false }: Props) {
  const events = [...state.auditEvents].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const testId = panel ? "audit-log-panel" : "audit-log";

  if (events.length === 0) {
    return (
      <div
        data-testid={testId}
        className="rounded-2xl border border-[var(--divider)] bg-white p-6 text-center"
      >
        <p className="text-sm text-[var(--ink-muted)]">
          No activity yet — post a call-out in the team chat to begin.
        </p>
      </div>
    );
  }

  return (
    <div data-testid={testId} className="space-y-1">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[var(--ink)]">Agent Activity</h2>
        <p className="text-xs text-[var(--ink-muted)]">Every decision and the reason behind it</p>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-[var(--divider)]" />

        <ol className="space-y-3">
          {events.map((e) => {
            const icon = ACTION_ICONS[e.action] ?? "·";
            const color = ACTION_COLORS[e.action] ?? "#6b7280";
            const aColor = actorColor(e.actor);

            return (
              <li
                key={e.id}
                data-testid="audit-event"
                data-action={e.action}
                className="relative flex gap-3 pl-1"
              >
                {/* Icon dot */}
                <div
                  className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg shadow-sm"
                  style={{ background: `${color}18`, border: `1.5px solid ${color}40` }}
                >
                  <span role="img" aria-hidden>{icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 rounded-xl border border-[var(--divider)] bg-white px-3 py-2.5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {e.action.replace(/_/g, " ")}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
                      style={{ background: aColor }}
                    >
                      {actorBadge(e.actor)}
                    </span>
                    {e.action === "auto_assigned" && (
                      <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-teal-800">
                        done
                      </span>
                    )}
                    {e.action === "escalated" && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-red-800">
                        escalated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--ink)] leading-snug">{e.reason}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-[10px] text-[var(--ink-muted)]">{timeLabel(e.timestamp)}</p>
                    {e.aiProvider && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
                        style={{
                          background: e.aiProvider === "rules" ? "#f3f4f6" : "#eff6ff",
                          color: e.aiProvider === "rules" ? "#6b7280" : "#1d4ed8",
                          border: `1px solid ${e.aiProvider === "rules" ? "#e5e7eb" : "#bfdbfe"}`,
                        }}
                      >
                        {e.aiProvider === "rules"
                          ? "rules"
                          : e.aiProvider === "bob"
                            ? `IBM Bob${e.aiModelId ? ` · ${e.aiModelId}` : ""}${e.aiLatencyMs != null ? ` · ${e.aiLatencyMs}ms` : ""}`
                            : `watsonx${e.aiModelId ? ` · ${e.aiModelId}` : ""}${e.aiLatencyMs != null ? ` · ${e.aiLatencyMs}ms` : ""}`}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
