"use client";

import { useState } from "react";

interface Props {
  nowIso: string;
  busy: boolean;
  onReset: () => Promise<void>;
  onFastForward: () => Promise<void>;
  light?: boolean;
}

export function AdminDrawer({ nowIso, busy, onReset, onFastForward, light }: Props) {
  const [open, setOpen] = useState(false);
  const clock = new Date(nowIso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Admin controls"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition ${
          light
            ? "border border-[var(--divider)] bg-white text-[var(--ink-muted)] shadow-sm hover:text-[var(--ink)]"
            : "text-white/40 hover:bg-white/10 hover:text-white/70"
        }`}
      >
        ⚙
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[var(--divider)] bg-white p-4 shadow-xl"
          data-testid="admin-drawer"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
            Admin
          </p>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink)]" data-testid="demo-clock">
              {clock} UTC
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-testid="reset-demo"
              disabled={busy}
              onClick={async () => {
                setOpen(false);
                await onReset();
              }}
              className="min-h-11 rounded-xl border border-[var(--divider)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--ink)] disabled:opacity-50"
            >
              Reset demo
            </button>
            <button
              type="button"
              data-testid="fast-forward"
              disabled={busy}
              onClick={async () => {
                setOpen(false);
                await onFastForward();
              }}
              className="min-h-11 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Fast forward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
