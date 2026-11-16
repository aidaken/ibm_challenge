// ShiftFix — written by IBM Bob

"use client";

interface Props {
  nowIso: string;
  onReset: () => Promise<void>;
  onFastForward: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
  dark?: boolean;
}

export function DemoControls({
  nowIso,
  onReset,
  onFastForward,
  busy,
  error,
  dark,
}: Props) {
  const clock = new Date(nowIso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  return (
    <section
      className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 ${
        dark
          ? "border border-white/10 bg-white/5"
          : "border border-[var(--divider)] bg-white"
      }`}
      data-testid="demo-controls"
    >
      <p className={`mr-auto text-xs ${dark ? "text-white/40" : "text-[var(--ink-muted)]"}`}>
        <span
          className={`font-semibold ${dark ? "text-white/70" : "text-[var(--ink)]"}`}
          data-testid="demo-clock"
        >
          {clock} UTC
        </span>
      </p>
      {error ? (
        <p className="w-full text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="reset-demo"
        disabled={busy}
        onClick={() => void onReset()}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
          dark
            ? "border-white/20 bg-white/10 text-white"
            : "border-[var(--divider)] bg-[var(--surface)] text-[var(--ink)]"
        }`}
      >
        Reset
      </button>
      <button
        type="button"
        data-testid="fast-forward"
        disabled={busy}
        onClick={() => void onFastForward()}
        className="rounded-full bg-[var(--crew-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        Fast forward ⚡
      </button>
    </section>
  );
}
