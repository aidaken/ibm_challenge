// ShiftFix — written by IBM Bob

"use client";

interface Props {
  nowIso: string;
  onReset: () => Promise<void>;
  onFastForward: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
}

export function DemoControls({
  nowIso,
  onReset,
  onFastForward,
  busy,
  error,
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
      className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--divider)] bg-white px-3 py-2"
      data-testid="demo-controls"
    >
      <p className="mr-auto text-xs text-[var(--ink-muted)]">
        Demo clock{" "}
        <span className="font-semibold text-[var(--ink)]" data-testid="demo-clock">
          {nowIso}
        </span>
        <span className="ml-1 text-[var(--ink-muted)]">({clock} UTC)</span>
      </p>
      {error ? (
        <p className="w-full text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="reset-demo"
        disabled={busy}
        onClick={() => void onReset()}
        className="rounded-full border border-[var(--divider)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] disabled:opacity-50"
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
        Fast forward
      </button>
    </section>
  );
}
