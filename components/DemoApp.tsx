// ShiftFix — written by IBM Bob

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuditLog } from "@/components/audit/AuditLog";
import { ChatPanel, pickMessages } from "@/components/chat/ChatPanel";
import { DemoControls } from "@/components/demo/DemoControls";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { IDS } from "@/lib/db/seed";
import type { DemoState } from "@/lib/types";

type Tab = "schedule" | "group" | "dm" | "audit";

const PERSONAS = [
  { id: IDS.amanda, label: "Amanda" },
  { id: IDS.arlo, label: "Arlo" },
  { id: IDS.manager, label: "Manager" },
] as const;

export function DemoApp() {
  const [state, setState] = useState<DemoState | null>(null);
  const [tab, setTab] = useState<Tab>("schedule");
  const [personaId, setPersonaId] = useState<string>(IDS.amanda);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load demo state");
    const json = (await res.json()) as DemoState;
    setState(json);
  }, []);

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Load failed");
    });
  }, [refresh]);

  const applyState = (json: { state?: DemoState; error?: string }) => {
    if (json.error) setError(json.error);
    if (json.state) setState(json.state);
  };

  const sendMessage = async (text: string, channel: "group" | "dm") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: personaId,
          text,
          channel,
          dmPeerId: channel === "dm" ? IDS.arlo : null,
        }),
      });
      const json = (await res.json()) as { state?: DemoState; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Message failed");
        if (json.state) setState(json.state);
        return;
      }
      applyState(json);
      if (channel === "dm") setTab("dm");
      else if (channel === "group") setTab("group");
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = (await res.json()) as { state?: DemoState; error?: string };
      applyState(json);
      setTab("schedule");
      setPersonaId(IDS.amanda);
    } finally {
      setBusy(false);
    }
  };

  const fastForward = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/fast-forward", { method: "POST" });
      const json = (await res.json()) as { state?: DemoState; error?: string };
      applyState(json);
    } finally {
      setBusy(false);
    }
  };

  const groupMessages = useMemo(
    () => (state ? pickMessages(state, "group") : []),
    [state],
  );
  const dmMessages = useMemo(
    () => (state ? pickMessages(state, "dm", IDS.arlo) : []),
    [state],
  );

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        {error ? <p role="alert">{error}</p> : <p>Loading ShiftFix…</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#dbeafe_0%,_#f1f5f9_45%,_#e2e8f0_100%)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              AI Builders Challenge
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              ShiftFix
            </h1>
            <p className="text-sm text-slate-600">
              Call-out in, covered shift out — manager confirms once.
            </p>
          </div>
          <label className="text-sm text-slate-700">
            Posting as{" "}
            <select
              data-testid="persona-select"
              className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-medium"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
            >
              {PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </header>

        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
            data-testid="app-error"
          >
            {error}
          </div>
        ) : null}

        <DemoControls
          nowIso={state.nowIso}
          onReset={resetDemo}
          onFastForward={fastForward}
          busy={busy}
          error={null}
        />

        <nav className="flex flex-wrap gap-2" data-testid="tab-nav">
          {(
            [
              ["schedule", "Schedule"],
              ["group", "Team chat"],
              ["dm", "DM · Arlo"],
              ["audit", "Audit log"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`tab-${id}`}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main>
          {tab === "schedule" ? <ScheduleBoard state={state} /> : null}
          {tab === "group" ? (
            <ChatPanel
              title="Cafe crew"
              subtitle="Team chat · ShiftFix bot is here"
              messages={groupMessages}
              employees={state.employees}
              onSend={(text) => sendMessage(text, "group")}
            />
          ) : null}
          {tab === "dm" ? (
            <ChatPanel
              title="ShiftFix ↔ Arlo"
              subtitle="Private cover offer"
              messages={dmMessages}
              employees={state.employees}
              onSend={(text) => sendMessage(text, "dm")}
              emptyHint="Offers to Arlo will show up here."
            />
          ) : null}
          {tab === "audit" ? <AuditLog state={state} /> : null}
        </main>
      </div>
    </div>
  );
}
