// ShiftFix — written by IBM Bob

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuditLog } from "@/components/audit/AuditLog";
import { Avatar } from "@/components/chat/Avatar";
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
  const [tab, setTab] = useState<Tab>("group");
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

  const openChat = (next: Tab) => {
    setTab(next);
    if (next === "dm") setPersonaId(IDS.arlo);
  };

  const sendMessage = async (text: string, channel: "group" | "dm") => {
    setBusy(true);
    setError(null);
    // Arlo's DM thread always posts as Arlo so "yes" can't be sent as Amanda by mistake.
    const senderId = channel === "dm" ? IDS.arlo : personaId;
    if (channel === "dm") setPersonaId(IDS.arlo);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId,
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
      else setTab("group");
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
      setTab("group");
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--ink-muted)]">
        {error ? <p role="alert">{error}</p> : <p className="online-dot">Loading ShiftFix…</p>}
      </div>
    );
  }

  const groupPreview =
    groupMessages[groupMessages.length - 1]?.text ?? "ShiftFix is in this chat";
  const dmPreview =
    dmMessages[dmMessages.length - 1]?.text ?? "Private cover offers land here";

  const chatUserId = tab === "dm" ? IDS.arlo : personaId;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-b border-[var(--divider)] bg-white lg:w-[320px] lg:border-b-0 lg:border-r">
          <div className="bg-[var(--crew-blue)] px-4 py-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
              AI Builders Challenge
            </p>
            <h1 className="text-2xl font-bold tracking-tight">ShiftFix</h1>
            <p className="mt-0.5 text-xs text-white/90">
              Call-out in · covered shift out
            </p>
          </div>

          <div className="space-y-1 p-2">
            <button
              type="button"
              onClick={() => openChat("group")}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                tab === "group" ? "bg-sky-50" : "hover:bg-[var(--surface)]"
              }`}
            >
              <div className="relative">
                <Avatar name="Cafe" size="lg" />
                <span className="online-dot absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-[var(--ink)]">Cafe crew</p>
                  <span className="text-[10px] text-[var(--ink-muted)]">now</span>
                </div>
                <p className="truncate text-xs text-[var(--ink-muted)]">{groupPreview}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openChat("dm")}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                tab === "dm" ? "bg-sky-50" : "hover:bg-[var(--surface)]"
              }`}
            >
              <Avatar name="Arlo" size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-[var(--ink)]">Arlo</p>
                  <span className="text-[10px] text-[var(--ink-muted)]">DM</span>
                </div>
                <p className="truncate text-xs text-[var(--ink-muted)]">{dmPreview}</p>
              </div>
            </button>
          </div>

          <div className="mt-auto space-y-2 border-t border-[var(--divider)] p-3">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
              Posting as
              <select
                data-testid="persona-select"
                className="mt-1 w-full rounded-xl border border-[var(--divider)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
                value={personaId}
                onChange={(e) => {
                  const next = e.target.value;
                  setPersonaId(next);
                  if (next === IDS.arlo) setTab("dm");
                  if (next === IDS.amanda || next === IDS.manager) setTab("group");
                }}
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <DemoControls
              nowIso={state.nowIso}
              onReset={resetDemo}
              onFastForward={fastForward}
              busy={busy}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-[var(--divider)] bg-white px-2 py-2"
            data-testid="tab-nav"
          >
            {(
              [
                ["group", "Chats"],
                ["dm", "DM"],
                ["schedule", "Schedule"],
                ["audit", "Audit"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                data-testid={`tab-${id}`}
                onClick={() => openChat(id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === id
                    ? "bg-[var(--crew-blue)] text-white"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface)]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {error ? (
            <div
              className="mx-3 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
              data-testid="app-error"
            >
              {error}
            </div>
          ) : null}

          <main className="flex-1 p-0 sm:p-4">
            {tab === "schedule" ? <ScheduleBoard state={state} /> : null}
            {tab === "group" ? (
              <ChatPanel
                title="Cafe crew"
                subtitle="5 people · ShiftFix bot is here"
                messages={groupMessages}
                employees={state.employees}
                currentUserId={chatUserId}
                memberCount={5}
                onSend={(text) => sendMessage(text, "group")}
              />
            ) : null}
            {tab === "dm" ? (
              <ChatPanel
                title="Arlo"
                subtitle="Direct message · cover offers"
                messages={dmMessages}
                employees={state.employees}
                currentUserId={chatUserId}
                onSend={(text) => sendMessage(text, "dm")}
                emptyHint="When ShiftFix finds cover, the offer shows up here."
              />
            ) : null}
            {tab === "audit" ? <AuditLog state={state} /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}
