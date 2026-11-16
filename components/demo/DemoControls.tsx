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
  return (
    <section
      className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm"
      data-testid="demo-controls"
    >
      <h2 className="text-lg font-semibold">Demo controls</h2>
      <p className="mb-3 text-sm text-slate-300">
        Clock: <span data-testid="demo-clock">{nowIso}</span>
      </p>
      {error ? (
        <p className="mb-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="reset-demo"
          disabled={busy}
          onClick={() => void onReset()}
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          Reset demo data
        </button>
        <button
          type="button"
          data-testid="fast-forward"
          disabled={busy}
          onClick={() => void onFastForward()}
          className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Fast forward time
        </button>
      </div>
    </section>
  );
}
