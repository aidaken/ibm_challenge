"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentActivity } from "@/components/audit/AgentActivity";
import { ChatPanel, pickMessages } from "@/components/chat/ChatPanel";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import {
  clearBrowserState,
  loadBrowserState,
  saveBrowserState,
} from "@/lib/db/browserStore";
import { IDS } from "@/lib/db/seed";
import type { DemoState } from "@/lib/types";

type StoreBackend = "supabase" | "memory";

interface StatePayload {
  state?: DemoState;
  backend?: StoreBackend;
  error?: string;
}

const BOT_DELAY_MS = 1800;

type Tab = "group" | "dm" | "schedule" | "audit";

// ── Hidden admin drawer ──────────────────────────────────────────────────────

function AdminDrawer({
  nowIso,
  busy,
  onReset,
  onFastForward,
}: {
  nowIso: string;
  busy: boolean;
  onReset: () => Promise<void>;
  onFastForward: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const clock = new Date(nowIso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  return (
    <>
      <button
        type="button"
        aria-label="Admin controls"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/30 hover:text-white/60 transition-colors"
        style={{ fontSize: 14 }}
      >
        ⚙
      </button>
      {open && (
        <div className="absolute right-4 top-16 z-50 rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl min-w-[220px]">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Admin</p>
          <p className="mb-3 text-xs text-white/50">
            <span className="font-semibold text-white/70" data-testid="demo-clock">{clock} UTC</span>
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-testid="reset-demo"
              disabled={busy}
              onClick={async () => { setOpen(false); await onReset(); }}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Reset demo
            </button>
            <button
              type="button"
              data-testid="fast-forward"
              disabled={busy}
              onClick={async () => { setOpen(false); await onFastForward(); }}
              className="rounded-xl bg-amber-500/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Fast forward ⚡
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onSelect,
  dmLabel,
  unreadGroup,
  unreadDm,
}: {
  active: Tab;
  onSelect: (t: Tab) => void;
  dmLabel: string;
  unreadGroup: number;
  unreadDm: number;
}) {
  const tabs: { id: Tab; label: string; unread?: number }[] = [
    { id: "group", label: "Team chat", unread: unreadGroup },
    { id: "dm", label: `DM · ${dmLabel}`, unread: unreadDm },
    { id: "schedule", label: "Schedule" },
    { id: "audit", label: "Agent Activity" },
  ];
  return (
    <div className="flex border-b border-white/10 bg-[#111]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          data-testid={`tab-${t.id}`}
          onClick={() => onSelect(t.id)}
          className={`relative flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
            active === t.id
              ? "border-b-2 border-[var(--crew-blue)] text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          {t.label}
          {t.unread ? (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
              {t.unread > 9 ? "9+" : t.unread}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ── Persona selector ─────────────────────────────────────────────────────────

function PersonaBar({
  employees,
  currentId,
  onSelect,
}: {
  employees: DemoState["employees"];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const humans = employees.filter((e) => !e.isBot && !e.isManager);
  const manager = employees.find((e) => e.isManager);

  return (
    <div className="flex items-center gap-2 border-b border-white/5 bg-[#0d0d0d] px-4 py-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 mr-1">You:</span>
      <select
        data-testid="persona-select"
        value={currentId}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white outline-none focus:border-[var(--crew-blue)]"
      >
        {humans.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
        {manager && <option value={manager.id}>{manager.name}</option>}
      </select>
      <span className="ml-auto text-[10px] text-white/20">
        {employees.find((e) => e.id === currentId)?.roles.join(", ")}
      </span>
    </div>
  );
}

// ── DM quick-reply buttons ───────────────────────────────────────────────────

function DmQuickReplies({ onSend, disabled }: { onSend: (text: string) => Promise<void>; disabled: boolean }) {
  return (
    <div className="flex gap-2 px-3 py-2 border-t border-[var(--divider)] bg-white">
      <button
        type="button"
        disabled={disabled}
        onClick={() => void onSend("yes")}
        className="rounded-full bg-teal-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        ✓ Accept
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void onSend("no")}
        className="rounded-full bg-red-400 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        ✗ Decline
      </button>
    </div>
  );
}

// ── Main app ─────────────────────────────────────────────────────────────────

export function DemoApp() {
  const [visibleState, setVisibleState] = useState<DemoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("group");
  const [currentPersonaId, setCurrentPersonaId] = useState<string>(IDS.amanda);
  const [typingChannel, setTypingChannel] = useState<"group" | "dm" | null>(null);

  const seenGroupRef = useRef(0);
  const seenDmRef = useRef(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [dmUnread, setDmUnread] = useState(0);
  const backendRef = useRef<StoreBackend>("memory");
  const trueStateRef = useRef<DemoState | null>(null);
  const botRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyServerState = useCallback((state: DemoState, be?: StoreBackend) => {
    trueStateRef.current = state;
    setVisibleState(state);
    if (be) {
      backendRef.current = be;
    }
    if ((be ?? backendRef.current) === "memory") {
      saveBrowserState(state);
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load demo state");
    const json = (await res.json()) as StatePayload & DemoState;
    // Support both { state, backend } and legacy bare DemoState
    const state = json.state ?? (json as DemoState);
    const be = json.backend ?? "memory";
    backendRef.current = be;

    if (be === "memory") {
      const local = loadBrowserState();
      // Only hydrate from localStorage when it is ahead of (or equal to) the server.
      // Avoids a race where a slow first refresh PUT clobbers a just-completed reset.
      if (local && local.messages.length >= (state.messages?.length ?? 0)) {
        await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: local }),
        });
        applyServerState(local, be);
        return;
      }
    }

    if (!Array.isArray(state.employees)) {
      throw new Error("Invalid demo state from server");
    }
    applyServerState(state, be);
  }, [applyServerState]);

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Load failed");
    });
  }, [refresh]);

  // DM thread follows the selected persona (you are that person in the demo).
  // Auto-switching to currentOfferId broke split flows (Maya+Arlo pending at once).
  const dmPeerId = currentPersonaId;

  const dmPersonaName = useMemo(() => {
    if (!visibleState) return "Arlo";
    return visibleState.employees.find((e) => e.id === dmPeerId)?.name ?? "DM";
  }, [visibleState, dmPeerId]);

  // Count unread
  useEffect(() => {
    if (!visibleState) return;
    const groupCount = pickMessages(visibleState, "group").length;
    const dmCount = pickMessages(visibleState, "dm", dmPeerId).length;
    setGroupUnread(Math.max(0, groupCount - seenGroupRef.current));
    setDmUnread(Math.max(0, dmCount - seenDmRef.current));
  }, [visibleState, dmPeerId]);

  const markGroupRead = () => {
    if (!visibleState) return;
    seenGroupRef.current = pickMessages(visibleState, "group").length;
    setGroupUnread(0);
  };
  const markDmRead = () => {
    if (!visibleState) return;
    seenDmRef.current = pickMessages(visibleState, "dm", dmPeerId).length;
    setDmUnread(0);
  };

  const revealBotMessages = useCallback((next: DemoState) => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    botRevealTimer.current = setTimeout(() => {
      setVisibleState(next);
      setTypingChannel(null);
    }, BOT_DELAY_MS);
  }, []);

  const sendMessage = useCallback(async (
    text: string,
    channel: "group" | "dm",
    senderId: string,
    peerIdOverride?: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const peerId = peerIdOverride ?? (channel === "dm" ? dmPeerId : null);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId,
          text,
          channel,
          dmPeerId: peerId,
          clientState:
            backendRef.current === "memory" ? trueStateRef.current : undefined,
        }),
      });
      const json = (await res.json()) as StatePayload;
      if (!res.ok) {
        setError(json.error ?? "Message failed");
        if (json.state) applyServerState(json.state, json.backend);
        return;
      }
      if (json.state) {
        const newState = json.state;
        if (json.backend) {
          backendRef.current = json.backend;
        }
        applyServerState(newState, json.backend ?? backendRef.current);
        trueStateRef.current = newState;

        const botId = newState.employees.find((e) => e.isBot)?.id;
        const prevGroupCount = visibleState ? pickMessages(visibleState, "group").length : 0;
        const prevDmCount = visibleState ? pickMessages(visibleState, "dm", dmPeerId).length : 0;
        const newGroupMsgs = pickMessages(newState, "group");
        const newDmMsgs = pickMessages(newState, "dm", dmPeerId);
        const hasBotGroupReply = botId && newGroupMsgs.slice(prevGroupCount).some((m) => m.senderId === botId);
        const hasBotDmReply = botId && newDmMsgs.slice(prevDmCount).some((m) => m.senderId === botId);

        if (hasBotGroupReply || hasBotDmReply) {
          const withoutBot: DemoState = {
            ...newState,
            messages: newState.messages.filter((m) => {
              if (m.senderId !== botId) return true;
              const isNewGroup = m.channel === "group" && newGroupMsgs.indexOf(m) >= prevGroupCount;
              const isNewDm = m.channel === "dm" && newDmMsgs.indexOf(m) >= prevDmCount;
              return !isNewGroup && !isNewDm;
            }),
          };
          setVisibleState(withoutBot);
          setTypingChannel(hasBotGroupReply ? "group" : "dm");
          revealBotMessages(newState);
        } else {
          setVisibleState(newState);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [visibleState, dmPeerId, revealBotMessages, applyServerState]);

  const resetDemo = async () => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    setTypingChannel(null);
    setBusy(true);
    setError(null);
    seenGroupRef.current = 0;
    seenDmRef.current = 0;
    setGroupUnread(0);
    setDmUnread(0);
    setCurrentPersonaId(IDS.amanda);
    setActiveTab("group");
    clearBrowserState();
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = (await res.json()) as StatePayload;
      if (json.error) setError(json.error);
      if (json.state) applyServerState(json.state, json.backend);
    } finally {
      setBusy(false);
    }
  };

  const fastForward = async () => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    setTypingChannel(null);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/fast-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientState:
            backendRef.current === "memory" ? trueStateRef.current : undefined,
        }),
      });
      const json = (await res.json()) as StatePayload;
      if (json.error) setError(json.error);
      if (json.state) applyServerState(json.state, json.backend);
    } finally {
      setBusy(false);
    }
  };

  const groupMessages = useMemo(
    () => (visibleState ? pickMessages(visibleState, "group") : []),
    [visibleState],
  );
  const dmMessages = useMemo(
    () => (visibleState ? pickMessages(visibleState, "dm", dmPeerId) : []),
    [visibleState, dmPeerId],
  );

  if (!visibleState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111] text-white/60">
        {error ? <p role="alert">{error}</p> : <p>Loading ShiftFix…</p>}
      </div>
    );
  }

  const isCurrentPersonaDmPeer = currentPersonaId === dmPeerId;

  return (
    <div className="flex min-h-screen flex-col bg-[#111]">
      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">AI for Business · IBM</p>
          <h1 className="text-lg font-black tracking-tight text-white">ShiftFix</h1>
        </div>
        <div className="flex items-center gap-2">
          {busy && (
            <span className="text-[10px] text-[var(--crew-blue)] animate-pulse font-semibold">thinking…</span>
          )}
          <AdminDrawer
            nowIso={visibleState.nowIso}
            busy={busy}
            onReset={resetDemo}
            onFastForward={fastForward}
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-xl border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <PersonaBar
        employees={visibleState.employees}
        currentId={currentPersonaId}
        onSelect={(id) => {
          setCurrentPersonaId(id);
        }}
      />

      <TabBar
        active={activeTab}
        onSelect={(t) => {
          setActiveTab(t);
          if (t === "group") markGroupRead();
          if (t === "dm") markDmRead();
        }}
        dmLabel={dmPersonaName}
        unreadGroup={groupUnread}
        unreadDm={dmUnread}
      />

      {/* Panel body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "group" && (
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <ChatPanel
              messages={groupMessages}
              employees={visibleState.employees}
              currentUserId={currentPersonaId}
              typing={typingChannel === "group"}
              disabled={busy}
              emptyHint="Group chat starts here"
              onSend={async (text) => {
                markGroupRead();
                await sendMessage(text, "group", currentPersonaId);
              }}
            />
          </div>
        )}

        {activeTab === "dm" && (
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="border-b border-[var(--divider)] bg-[var(--surface)] px-4 py-2">
              <p className="text-[11px] font-bold text-[var(--ink-muted)]">
                ShiftFix → {dmPersonaName}
              </p>
            </div>
            <ChatPanel
              messages={dmMessages}
              employees={visibleState.employees}
              currentUserId={isCurrentPersonaDmPeer ? currentPersonaId : dmPeerId}
              typing={typingChannel === "dm"}
              disabled={busy}
              emptyHint="Cover offer lands here"
              onSend={async (text) => {
                markDmRead();
                // Always send DM as the person the offer is addressed to
                await sendMessage(text, "dm", isCurrentPersonaDmPeer ? currentPersonaId : dmPeerId, dmPeerId);
              }}
            />
            {isCurrentPersonaDmPeer && (
              <DmQuickReplies
                disabled={busy}
                onSend={async (text) => {
                  markDmRead();
                  await sendMessage(text, "dm", currentPersonaId, dmPeerId);
                }}
              />
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="flex-1 overflow-y-auto bg-[var(--background)] p-4">
            <ScheduleBoard state={visibleState} />
          </div>
        )}

        {activeTab === "audit" && (
          <div className="flex-1 overflow-y-auto bg-[var(--background)] p-4">
            <AgentActivity state={visibleState} />
          </div>
        )}
      </div>
    </div>
  );
}
