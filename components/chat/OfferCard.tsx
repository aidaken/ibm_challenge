"use client";

import type { OfferStatus } from "@/lib/types";

interface Props {
  role: string;
  dayLabel: string;
  windowLabel: string;
  status: OfferStatus | "pending";
  onAccept?: () => void;
  onDecline?: () => void;
  disabled?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  timed_out: "Expired",
  skipped: "Taken",
};

export function OfferCard({
  role,
  dayLabel,
  windowLabel,
  status,
  onAccept,
  onDecline,
  disabled,
}: Props) {
  const interactive = status === "pending" && !disabled;

  return (
    <div
      data-testid="offer-card"
      className="max-w-[85%] rounded-2xl border border-teal-200 bg-teal-50/80 p-3 shadow-sm"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-teal-800">
        Shift offer
      </p>
      <p className="mt-1 text-[15px] font-semibold text-[var(--ink)] capitalize">{role}</p>
      <p className="text-sm text-[var(--ink-muted)]">
        {dayLabel} · {windowLabel}
      </p>
      {interactive ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            data-testid="offer-accept"
            onClick={onAccept}
            className="min-h-11 flex-1 rounded-xl bg-[var(--accent)] px-3 text-sm font-bold text-white"
          >
            Accept
          </button>
          <button
            type="button"
            data-testid="offer-decline"
            onClick={onDecline}
            className="min-h-11 flex-1 rounded-xl border border-[var(--divider)] bg-white px-3 text-sm font-bold text-[var(--ink)]"
          >
            Decline
          </button>
        </div>
      ) : (
        <p
          data-testid="offer-status"
          className="mt-2 text-xs font-bold uppercase tracking-wide text-teal-900"
        >
          {STATUS_LABEL[status] ?? status}
        </p>
      )}
    </div>
  );
}
