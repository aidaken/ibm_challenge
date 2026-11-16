// ShiftFix — written by IBM Bob
// Cheat sheet so the demo stays reliable without guessing.

interface Props {
  step: "call_out" | "accept" | "confirm" | "done" | "idle";
}

const COPY: Record<Props["step"], { who: string; where: string; text: string }> = {
  idle: {
    who: "Start",
    where: "Reset, then open Team chat as Amanda",
    text: "hey I'm not available for my Monday morning shift, can someone cover me?",
  },
  call_out: {
    who: "Amanda → Team chat",
    where: "Posting as Amanda · Team chat",
    text: "hey I'm not available for my Monday morning shift, can someone cover me?",
  },
  accept: {
    who: "Arlo → DM",
    where: "Posting as Arlo · DM · Arlo",
    text: "yes",
  },
  confirm: {
    who: "Manager → Team chat",
    where: "Posting as Manager · Team chat",
    text: "confirm",
  },
  done: {
    who: "Done",
    where: "Check Schedule + Audit log",
    text: "Monday shift should show Arlo as covered.",
  },
};

export function ScriptHints({ step }: Props) {
  const tip = COPY[step];
  return (
    <aside
      className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950"
      data-testid="script-hints"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
        Say this next · {tip.who}
      </p>
      <p className="mt-0.5 text-xs text-sky-800">{tip.where}</p>
      <p className="mt-1.5 rounded-lg bg-white px-2.5 py-2 font-medium text-slate-900 ring-1 ring-sky-100">
        “{tip.text}”
      </p>
    </aside>
  );
}
