// ShiftFix — written by IBM Bob

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditLog } from "@/components/audit/AuditLog";
import { PhoneFrame, type PhoneTab } from "@/components/PhoneFrame";
import { ChatPanel, pickMessages } from "@/components/chat/ChatPanel";
import { DemoControls } from "@/components/demo/DemoControls";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { IDS } from "@/lib/db/seed";
import type { DemoState } from "@/lib/types";

// How long to show the typing indicator before revealing bot messages (ms)
const BOT_DELAY_MS = 5000;

export function DemoApp() {
  // visibleState is what the phones show — may lag behind trueState during typing
  const [trueState, setTrueState] = useState<DemoState | null>(null);
  const [visibleState, setVisibleState] = useState<DemoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Shared tab state — all 3 phones navigate together
  const [activeTab, setActiveTab] = useState<PhoneTab>("chat");
  // typing channels: "group" | "dm" | null
  const [typingChannel, setTypingChannel] = useState<"group" | "dm" | null>(null);
  // unread counts per phone
  const seenGroupRef = useRef(0);
  const seenDmRef = useRef(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [dmUnread, setDmUnread] = useState(0);
  const botRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load demo state");
    const json = (await res.json()) as DemoState;
    setTrueState(json);
    setVisibleState(json);
  }, []);

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Load failed");
    });
  }, [refresh]);

  // Count unread whenever visibleState changes
  useEffect(() => {
    if (!visibleState) return;
    const groupCount = pickMessages(visibleState, "group").length;
    const dmCount = pickMessages(visibleState, "dm", IDS.arlo).length;
    setGroupUnread(Math.max(0, groupCount - seenGroupRef.current));
    setDmUnread(Math.max(0, dmCount - seenDmRef.current));
  }, [visibleState]);

  const markGroupRead = () => {
    if (!visibleState) return;
    seenGroupRef.current = pickMessages(visibleState, "group").length;
    setGroupUnread(0);
  };

  const markDmRead = () => {
    if (!visibleState) return;
    seenDmRef.current = pickMessages(visibleState, "dm", IDS.arlo).length;
    setDmUnread(0);
  };

  // Reveal bot messages after delay
  const revealBotMessages = useCallback((next: DemoState) => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    botRevealTimer.current = setTimeout(() => {
      setVisibleState(next);
      setTypingChannel(null);
    }, BOT_DELAY_MS);
  }, []);

  const sendMessage = async (
    text: string,
    channel: "group" | "dm",
    senderId: string,
  ) => {
    setBusy(true);
    setError(null);
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
        if (json.state) {
          setTrueState(json.state);
          setVisibleState(json.state);
        }
        return;
      }
      if (json.state) {
        setTrueState(json.state);
        // Show the user's own message immediately on the visible state,
        // but hold bot messages back — just show typing indicator
        const newState = json.state;
        const prevVisible = visibleState;

        // Optimistically apply only non-bot messages to visibleState
        const botId = newState.employees.find((e) => e.isBot)?.id;
        const prevGroupCount = prevVisible
          ? pickMessages(prevVisible, "group").length
          : 0;
        const prevDmCount = prevVisible
          ? pickMessages(prevVisible, "dm", IDS.arlo).length
          : 0;

        // Check if bot replied (new bot messages exist)
        const newGroupMsgs = pickMessages(newState, "group");
        const newDmMsgs = pickMessages(newState, "dm", IDS.arlo);
        const hasBotGroupReply =
          botId &&
          newGroupMsgs.slice(prevGroupCount).some((m) => m.senderId === botId);
        const hasBotDmReply =
          botId &&
          newDmMsgs.slice(prevDmCount).some((m) => m.senderId === botId);

        if (hasBotGroupReply || hasBotDmReply) {
          // Show state without bot messages (user msg visible, bot held back)
          const withoutBot: DemoState = {
            ...newState,
            messages: newState.messages.filter((m) => {
              if (m.senderId !== botId) return true;
              // Keep old bot messages, only hide newly added ones
              const isNew =
                m.channel === "group"
                  ? newGroupMsgs.indexOf(m) >= prevGroupCount
                  : newDmMsgs.indexOf(m) >= prevDmCount;
              return !isNew;
            }),
          };
          setVisibleState(withoutBot);
          setTypingChannel(hasBotGroupReply ? "group" : "dm");
          revealBotMessages(newState);
        } else {
          // No bot reply, show immediately
          setVisibleState(newState);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    setTypingChannel(null);
    setBusy(true);
    setError(null);
    seenGroupRef.current = 0;
    seenDmRef.current = 0;
    setGroupUnread(0);
    setDmUnread(0);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = (await res.json()) as { state?: DemoState; error?: string };
      if (json.error) setError(json.error);
      if (json.state) {
        setTrueState(json.state);
        setVisibleState(json.state);
      }
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
      const res = await fetch("/api/demo/fast-forward", { method: "POST" });
      const json = (await res.json()) as { state?: DemoState; error?: string };
      if (json.error) setError(json.error);
      if (json.state) {
        setTrueState(json.state);
        setVisibleState(json.state);
      }
    } finally {
      setBusy(false);
    }
  };

  const groupMessages = useMemo(
    () => (visibleState ? pickMessages(visibleState, "group") : []),
    [visibleState],
  );
  const dmMessages = useMemo(
    () => (visibleState ? pickMessages(visibleState, "dm", IDS.arlo) : []),
    [visibleState],
  );

  if (!visibleState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] text-white/60">
        {error ? <p role="alert">{error}</p> : <p>Loading ShiftFix…</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1c1e]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            AI Builders Challenge
          </p>
          <h1 className="text-xl font-black tracking-tight text-white">ShiftFix</h1>
        </div>
        <DemoControls
          nowIso={visibleState.nowIso}
          onReset={resetDemo}
          onFastForward={fastForward}
          busy={busy}
          dark
        />
      </div>

      {error ? (
        <div className="mx-6 mb-3 rounded-xl border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </div>
      ) : null}

      {/* 3-phone row */}
      <div className="flex flex-wrap items-start justify-center gap-6 px-4 pb-6">

        {/* ── Phone 1: Amanda (group chat) ── */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Amanda</p>
          <PhoneFrame
            personaName="Cafe crew"
            personaColor="#00aff0"
            carrier="GroupMe"
            badge={groupUnread}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            scheduleContent={<ScheduleBoard state={visibleState} />}
          >
            <ChatPanel
              messages={groupMessages}
              employees={visibleState.employees}
              currentUserId={IDS.amanda}
              typing={typingChannel === "group"}
              disabled={busy}
              emptyHint="Group chat starts here"
              onSend={async (text) => {
                markGroupRead();
                await sendMessage(text, "group", IDS.amanda);
              }}
            />
          </PhoneFrame>
        </div>

        {/* ── Center info panel ── */}
        <div className="flex flex-col items-center gap-4 self-center" style={{ width: 200 }}>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 w-full">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Demo steps</p>
            <ol className="space-y-2 text-left text-[12px] text-white/70">
              <li className="flex gap-2"><span className="text-[var(--crew-blue)] font-bold">1.</span>Amanda texts the group</li>
              <li className="flex gap-2"><span className="text-[var(--crew-blue)] font-bold">2.</span>ShiftFix replies</li>
              <li className="flex gap-2"><span className="text-[var(--crew-blue)] font-bold">3.</span>Arlo gets a DM offer</li>
              <li className="flex gap-2"><span className="text-[var(--crew-blue)] font-bold">4.</span>Arlo says yes</li>
              <li className="flex gap-2"><span className="text-[var(--crew-blue)] font-bold">5.</span>Manager confirms</li>
            </ol>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 w-full">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Audit log</p>
            <AuditLog state={visibleState} compact />
          </div>
        </div>

        {/* ── Phone 2: Arlo (DM) ── */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Arlo</p>
          <PhoneFrame
            personaName="ShiftFix"
            personaColor="#0d9488"
            carrier="Direct Message"
            badge={dmUnread}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            scheduleContent={<ScheduleBoard state={visibleState} />}
          >
            <ChatPanel
              messages={dmMessages}
              employees={visibleState.employees}
              currentUserId={IDS.arlo}
              typing={typingChannel === "dm"}
              disabled={busy}
              emptyHint="Cover offer lands here"
              onSend={async (text) => {
                markDmRead();
                await sendMessage(text, "dm", IDS.arlo);
              }}
            />
          </PhoneFrame>
        </div>

        {/* ── Phone 3: Manager (group chat) ── */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Manager</p>
          <PhoneFrame
            personaName="Cafe crew"
            personaColor="#7c3aed"
            carrier="GroupMe"
            badge={0}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            scheduleContent={<ScheduleBoard state={visibleState} />}
          >
            <ChatPanel
              messages={groupMessages}
              employees={visibleState.employees}
              currentUserId={IDS.manager}
              typing={typingChannel === "group"}
              disabled={busy}
              emptyHint="Manager approves here"
              onSend={async (text) => {
                await sendMessage(text, "group", IDS.manager);
              }}
            />
          </PhoneFrame>
        </div>

      </div>
    </div>
  );
}
