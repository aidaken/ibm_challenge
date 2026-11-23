"use client";

import { useCallback, useMemo, useState } from "react";
import {
  COACH_PATHS,
  COACH_STEPS,
  getStep,
  type CoachAction,
  type CoachPath,
} from "@/lib/demo/paths";
import type { ShellSection } from "@/components/shell/LeftRail";

export interface DemoCoachActions {
  busy: boolean;
  resetDemo: () => Promise<void>;
  fastForward: () => Promise<void>;
  setSection: (s: ShellSection) => void;
  setPersonaId: (id: string) => void;
  openChat: (chatId: string) => void;
  sendMessage: (
    text: string,
    channel: "group" | "dm",
    senderId: string,
    peerIdOverride?: string | null,
  ) => Promise<void>;
}

interface Props {
  actions: DemoCoachActions;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function DemoCoach({ actions }: Props) {
  const [open, setOpen] = useState(true);
  const [pathId, setPathId] = useState(COACH_PATHS[0].id);
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());

  const path: CoachPath = useMemo(
    () => COACH_PATHS.find((p) => p.id === pathId) ?? COACH_PATHS[0],
    [pathId],
  );

  const pathSteps = useMemo(
    () => path.stepIds.map((id) => getStep(id)).filter(Boolean) as typeof COACH_STEPS,
    [path],
  );

  const runActions = useCallback(
    async (list: CoachAction[]) => {
      for (const a of list) {
        switch (a.type) {
          case "reset":
            await actions.resetDemo();
            setDoneIds(new Set());
            break;
          case "section":
            actions.setSection(a.section);
            break;
          case "persona":
            actions.setPersonaId(a.employeeId);
            break;
          case "openChat":
            actions.openChat(a.chatId);
            break;
          case "send":
            await actions.sendMessage(
              a.text,
              a.channel,
              a.asEmployeeId,
              a.channel === "dm" ? a.asEmployeeId : null,
            );
            break;
          case "fastForward":
            await actions.fastForward();
            break;
          case "wait":
            await wait(a.ms);
            break;
          default:
            break;
        }
      }
    },
    [actions],
  );

  const runStep = useCallback(
    async (stepId: string) => {
      const step = getStep(stepId);
      if (!step || actions.busy || runningStepId) return;
      setRunningStepId(stepId);
      try {
        await runActions(step.actions);
        setDoneIds((prev) => new Set(prev).add(stepId));
      } finally {
        setRunningStepId(null);
      }
    },
    [actions.busy, runActions, runningStepId],
  );

  const runPath = useCallback(async () => {
    if (actions.busy || runningStepId) return;
    for (const step of pathSteps) {
      if (step.optional) continue;
      setRunningStepId(step.id);
      try {
        await runActions(step.actions);
        setDoneIds((prev) => new Set(prev).add(step.id));
      } finally {
        setRunningStepId(null);
      }
    }
  }, [actions.busy, pathSteps, runActions, runningStepId]);

  return (
    <div
      className="fixed bottom-20 left-3 z-40 w-[min(100vw-1.5rem,320px)] lg:bottom-3 lg:left-[4.5rem]"
      data-testid="demo-coach"
    >
      {!open ? (
        <button
          type="button"
          data-testid="demo-coach-open"
          onClick={() => setOpen(true)}
          className="rounded-2xl border border-[var(--divider)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg"
        >
          Demo Coach
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--divider)] bg-white shadow-xl">
          <header className="flex items-start justify-between gap-2 border-b border-[var(--divider)] px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                Demo Coach
              </p>
              <p className="text-xs text-[var(--ink-muted)] leading-snug">{path.blurb}</p>
            </div>
            <button
              type="button"
              aria-label="Collapse demo coach"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-lg px-2 py-1 text-sm text-[var(--ink-muted)] hover:bg-[var(--surface)]"
            >
              −
            </button>
          </header>

          <div className="flex gap-1 border-b border-[var(--divider)] p-2">
            {COACH_PATHS.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`demo-path-${p.id}`}
                onClick={() => setPathId(p.id)}
                className={`min-h-9 flex-1 rounded-xl px-1.5 text-[11px] font-semibold transition ${
                  pathId === p.id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>

          <ol className="max-h-[40vh] space-y-1 overflow-y-auto p-2">
            {pathSteps.map((step, i) => {
              const done = doneIds.has(step.id);
              const running = runningStepId === step.id;
              return (
                <li
                  key={step.id}
                  className="flex items-start gap-2 rounded-xl border border-[var(--divider)] px-2 py-2"
                  data-testid={`demo-step-${step.id}`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done
                        ? "bg-teal-100 text-teal-800"
                        : "bg-[var(--surface)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--ink)]">{step.label}</p>
                    {step.hint && (
                      <p className="text-[10px] text-[var(--ink-muted)] leading-snug">
                        {step.hint}
                        {step.optional ? " · optional" : ""}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid={`demo-do-${step.id}`}
                    disabled={actions.busy || !!runningStepId}
                    onClick={() => void runStep(step.id)}
                    className="min-h-9 shrink-0 rounded-lg bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--ink)] disabled:opacity-50"
                  >
                    {running ? "…" : "Do"}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="border-t border-[var(--divider)] p-2">
            <button
              type="button"
              data-testid="demo-run-path"
              disabled={actions.busy || !!runningStepId}
              onClick={() => void runPath()}
              className="min-h-11 w-full rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
            >
              Run this path
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
