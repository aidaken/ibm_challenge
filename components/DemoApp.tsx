"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentActivity } from "@/components/audit/AgentActivity";
import { type ChatRowData } from "@/components/chat/ChatRow";
import { ChatList } from "@/components/chat/ChatList";
import { Conversation, pickMessages } from "@/components/chat/Conversation";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { AdminDrawer } from "@/components/shell/AdminDrawer";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { LeftRail, type ShellSection } from "@/components/shell/LeftRail";
import {
  clearBrowserState,
  loadBrowserState,
  saveBrowserState,
} from "@/lib/db/browserStore";
import { IDS } from "@/lib/db/seed";
import type { DemoState, Offer } from "@/lib/types";

type StoreBackend = "supabase" | "memory";

interface StatePayload {
  state?: DemoState;
  backend?: StoreBackend;
  error?: string;
}

const BOT_DELAY_MS = 1800;
const TEAM_CHAT_ID = "group";

type ActiveChat = string | null; // TEAM_CHAT_ID or employee id for DM

function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function DemoApp() {
  const [visibleState, setVisibleState] = useState<DemoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<ShellSection>("chats");
  const [activeChat, setActiveChat] = useState<ActiveChat>(TEAM_CHAT_ID);
  const [mobileInConvo, setMobileInConvo] = useState(false);
  const [currentPersonaId, setCurrentPersonaId] = useState<string>(IDS.amanda);
  const [typingChannel, setTypingChannel] = useState<"group" | "dm" | null>(null);
  const [typingPeer, setTypingPeer] = useState<string | null>(null);

  const seenRef = useRef<Record<string, number>>({ [TEAM_CHAT_ID]: 0 });
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const backendRef = useRef<StoreBackend>("memory");
  const trueStateRef = useRef<DemoState | null>(null);
  const botRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyServerState = useCallback((state: DemoState, be?: StoreBackend) => {
    trueStateRef.current = state;
    setVisibleState(state);
    if (be) backendRef.current = be;
    if ((be ?? backendRef.current) === "memory") saveBrowserState(state);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load demo state");
    const json = (await res.json()) as StatePayload & DemoState;
    const state = json.state ?? (json as DemoState);
    const be = json.backend ?? "memory";
    backendRef.current = be;

    if (be === "memory") {
      const local = loadBrowserState();
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
    if (!Array.isArray(state.employees)) throw new Error("Invalid demo state from server");
    applyServerState(state, be);
  }, [applyServerState]);

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Load failed");
    });
  }, [refresh]);

  const botId = visibleState?.employees.find((e) => e.isBot)?.id;

  // Per-chat unread counts
  useEffect(() => {
    if (!visibleState) return;
    const next: Record<string, number> = {};
    const groupCount = pickMessages(visibleState, "group").length;
    next[TEAM_CHAT_ID] = Math.max(0, groupCount - (seenRef.current[TEAM_CHAT_ID] ?? 0));

    const peers = new Set(
      visibleState.messages
        .filter((m) => m.channel === "dm" && m.dmPeerId)
        .map((m) => m.dmPeerId as string),
    );
    for (const peer of peers) {
      const count = pickMessages(visibleState, "dm", peer).length;
      next[peer] = Math.max(0, count - (seenRef.current[peer] ?? 0));
    }
    setUnreadMap(next);
  }, [visibleState]);

  const markRead = useCallback(
    (chatId: string) => {
      if (!visibleState) return;
      if (chatId === TEAM_CHAT_ID) {
        seenRef.current[TEAM_CHAT_ID] = pickMessages(visibleState, "group").length;
      } else {
        seenRef.current[chatId] = pickMessages(visibleState, "dm", chatId).length;
      }
      setUnreadMap((prev) => ({ ...prev, [chatId]: 0 }));
    },
    [visibleState],
  );

  const openChat = useCallback(
    (chatId: string) => {
      setActiveChat(chatId);
      setSection("chats");
      setMobileInConvo(true);
      markRead(chatId);
    },
    [markRead],
  );

  const revealBotMessages = useCallback((next: DemoState) => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    botRevealTimer.current = setTimeout(() => {
      setVisibleState(next);
      setTypingChannel(null);
      setTypingPeer(null);
    }, BOT_DELAY_MS);
  }, []);

  const sendMessage = useCallback(
    async (
      text: string,
      channel: "group" | "dm",
      senderId: string,
      peerIdOverride?: string | null,
    ) => {
      setBusy(true);
      setError(null);
      try {
        const peerId =
          peerIdOverride !== undefined
            ? peerIdOverride
            : channel === "dm"
              ? activeChat && activeChat !== TEAM_CHAT_ID
                ? activeChat
                : currentPersonaId
              : null;
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
          if (json.backend) backendRef.current = json.backend;
          applyServerState(newState, json.backend ?? backendRef.current);
          trueStateRef.current = newState;

          const bid = newState.employees.find((e) => e.isBot)?.id;
          const prevGroup = visibleState ? pickMessages(visibleState, "group").length : 0;
          const peer = peerId ?? currentPersonaId;
          const prevDm = visibleState ? pickMessages(visibleState, "dm", peer).length : 0;
          const newGroup = pickMessages(newState, "group");
          const newDm = pickMessages(newState, "dm", peer);
          const hasBotGroup =
            bid && newGroup.slice(prevGroup).some((m) => m.senderId === bid);
          const hasBotDm = bid && newDm.slice(prevDm).some((m) => m.senderId === bid);

          if (hasBotGroup || hasBotDm) {
            const withoutBot: DemoState = {
              ...newState,
              messages: newState.messages.filter((m) => {
                if (m.senderId !== bid) return true;
                const isNewGroup =
                  m.channel === "group" && newGroup.indexOf(m) >= prevGroup;
                const isNewDm =
                  m.channel === "dm" &&
                  m.dmPeerId === peer &&
                  newDm.indexOf(m) >= prevDm;
                return !isNewGroup && !isNewDm;
              }),
            };
            setVisibleState(withoutBot);
            setTypingChannel(hasBotGroup ? "group" : "dm");
            setTypingPeer(hasBotGroup ? null : peer);
            revealBotMessages(newState);
          } else {
            setVisibleState(newState);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [activeChat, applyServerState, currentPersonaId, revealBotMessages, visibleState],
  );

  const resetDemo = async () => {
    if (botRevealTimer.current) clearTimeout(botRevealTimer.current);
    setTypingChannel(null);
    setTypingPeer(null);
    setBusy(true);
    setError(null);
    seenRef.current = { [TEAM_CHAT_ID]: 0 };
    setUnreadMap({});
    setCurrentPersonaId(IDS.amanda);
    setSection("chats");
    setActiveChat(TEAM_CHAT_ID);
    setMobileInConvo(false);
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
    setTypingPeer(null);
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

  const chatRows: ChatRowData[] = useMemo(() => {
    if (!visibleState) return [];
    const groupMsgs = pickMessages(visibleState, "group");
    const lastGroup = groupMsgs[groupMsgs.length - 1];
    const rows: ChatRowData[] = [
      {
        id: TEAM_CHAT_ID,
        title: "Team Chat",
        preview: lastGroup?.text ?? "ShiftFix is online",
        timeLabel: lastGroup ? shortTime(lastGroup.createdAt) : "",
        unread: unreadMap[TEAM_CHAT_ID] ?? 0,
        isGroup: true,
        pinned: true,
        testId: "chat-row-group",
      },
    ];

    const peers = new Set(
      visibleState.messages
        .filter((m) => m.channel === "dm" && m.dmPeerId)
        .map((m) => m.dmPeerId as string),
    );
    // Always show current persona DM row so offers are discoverable
    peers.add(currentPersonaId);

    for (const peerId of peers) {
      if (peerId === botId) continue;
      const emp = visibleState.employees.find((e) => e.id === peerId);
      if (!emp || emp.isBot) continue;
      const msgs = pickMessages(visibleState, "dm", peerId);
      const last = msgs[msgs.length - 1];
      const pending = visibleState.offers.find(
        (o) => o.employeeId === peerId && o.status === "pending",
      );
      const preview = pending
        ? "New shift offer"
        : (last?.text ?? "Direct message with ShiftFix");
      rows.push({
        id: peerId,
        title: emp.name,
        preview,
        timeLabel: last ? shortTime(last.createdAt) : "",
        unread: unreadMap[peerId] ?? 0,
        testId: `chat-row-${emp.name.toLowerCase()}`,
      });
    }

    return rows;
  }, [visibleState, unreadMap, currentPersonaId, botId]);

  const pendingOfferForActive: Offer | null = useMemo(() => {
    if (!visibleState || !activeChat || activeChat === TEAM_CHAT_ID) return null;
    return (
      visibleState.offers.find(
        (o) => o.employeeId === activeChat && o.status === "pending",
      ) ??
      visibleState.offers
        .filter((o) => o.employeeId === activeChat)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0] ??
      null
    );
  }, [visibleState, activeChat]);

  const offerMeta = useMemo(() => {
    if (!visibleState || !pendingOfferForActive) {
      return { role: "barista", start: "", end: "" };
    }
    const req = visibleState.coverageRequests.find(
      (r) => r.id === pendingOfferForActive.requestId,
    );
    const shift = req
      ? visibleState.shifts.find((s) => s.id === req.shiftId)
      : undefined;
    if (pendingOfferForActive.partId) {
      const part = visibleState.coverageParts.find(
        (p) => p.id === pendingOfferForActive.partId,
      );
      if (part) {
        return {
          role: shift?.role ?? "barista",
          start: part.startsAt,
          end: part.endsAt,
        };
      }
    }
    return {
      role: shift?.role ?? "barista",
      start: shift?.start ?? "",
      end: shift?.end ?? "",
    };
  }, [visibleState, pendingOfferForActive]);

  const groupMessages = useMemo(
    () => (visibleState ? pickMessages(visibleState, "group") : []),
    [visibleState],
  );

  const activeDmMessages = useMemo(() => {
    if (!visibleState || !activeChat || activeChat === TEAM_CHAT_ID) return [];
    return pickMessages(visibleState, "dm", activeChat);
  }, [visibleState, activeChat]);

  const memberCount = visibleState
    ? visibleState.employees.filter((e) => !e.isBot).length + 1
    : 0;

  if (!visibleState) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface)] text-[var(--ink-muted)]">
        {error ? <p role="alert">{error}</p> : <p>Loading ShiftFix…</p>}
      </div>
    );
  }

  const isChats = section === "chats";

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--background)]">
      {/* E2E compatibility hooks (visually hidden, unique testids) */}
      <div className="sr-only" aria-hidden>
        <button type="button" data-testid="tab-group" onClick={() => openChat(TEAM_CHAT_ID)}>
          Team chat
        </button>
        <button type="button" data-testid="tab-dm" onClick={() => openChat(currentPersonaId)}>
          DM
        </button>
        <button
          type="button"
          data-testid="tab-schedule"
          onClick={() => {
            setSection("schedule");
            setMobileInConvo(false);
          }}
        >
          Schedule
        </button>
        <button
          type="button"
          data-testid="tab-audit"
          onClick={() => {
            setSection("audit");
            setMobileInConvo(false);
          }}
        >
          Agent Activity
        </button>
        {/* Always mounted so persona can switch from schedule/activity views */}
        <select
          data-testid="persona-select"
          value={currentPersonaId}
          onChange={(e) => setCurrentPersonaId(e.target.value)}
          aria-label="Viewing as"
        >
          {visibleState.employees
            .filter((e) => !e.isBot)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
        </select>
      </div>

      {error && (
        <div
          className="mx-3 mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeftRail
          section={section}
          onSelect={(s) => {
            setSection(s);
            if (s !== "chats") setMobileInConvo(false);
          }}
          adminSlot={<span className="sr-only">Admin lives in header</span>}
        />

        {/* Single admin control (keeps e2e unique) */}
        <div className="fixed right-3 top-3 z-50">
          <AdminDrawer
            nowIso={visibleState.nowIso}
            busy={busy}
            onReset={resetDemo}
            onFastForward={fastForward}
            light
          />
        </div>

        {/* Chat list: mobile when not in convo; always on md+ when chats */}
        {isChats && (
          <div
            className={`${
              mobileInConvo ? "hidden md:flex" : "flex"
            } min-h-0 w-full md:w-auto`}
          >
            <ChatList
              rows={chatRows}
              activeId={activeChat}
              onSelect={openChat}
              employees={visibleState.employees}
              currentPersonaId={currentPersonaId}
              onPersonaChange={setCurrentPersonaId}
            />
          </div>
        )}

        {/* Conversation */}
        {isChats && activeChat && (
          <div
            className={`${
              mobileInConvo ? "flex" : "hidden md:flex"
            } min-h-0 min-w-0 flex-1 flex-col`}
          >
            {activeChat === TEAM_CHAT_ID ? (
              <Conversation
                title="Team Chat"
                subtitle={`${memberCount} members`}
                isGroup
                messages={groupMessages}
                employees={visibleState.employees}
                currentUserId={currentPersonaId}
                botId={botId}
                typing={typingChannel === "group"}
                disabled={busy}
                showBack
                onBack={() => setMobileInConvo(false)}
                onSend={async (text) => {
                  markRead(TEAM_CHAT_ID);
                  await sendMessage(text, "group", currentPersonaId, null);
                }}
              />
            ) : (
              <Conversation
                title={
                  visibleState.employees.find((e) => e.id === activeChat)?.name ??
                  "DM"
                }
                subtitle={
                  currentPersonaId === activeChat
                    ? "Direct message with ShiftFix"
                    : "View only — switch persona to reply"
                }
                messages={activeDmMessages}
                employees={visibleState.employees}
                currentUserId={activeChat}
                botId={botId}
                pendingOffer={
                  currentPersonaId === activeChat ? pendingOfferForActive : null
                }
                offerShiftRole={offerMeta.role}
                offerWindow={
                  offerMeta.start
                    ? { start: offerMeta.start, end: offerMeta.end }
                    : undefined
                }
                dayLabel="Monday"
                typing={
                  typingChannel === "dm" &&
                  (typingPeer === activeChat || typingPeer === null)
                }
                disabled={busy || currentPersonaId !== activeChat}
                showBack
                onBack={() => setMobileInConvo(false)}
                onSend={async (text) => {
                  markRead(activeChat);
                  await sendMessage(text, "dm", activeChat, activeChat);
                }}
                onAcceptOffer={async () => {
                  markRead(activeChat);
                  await sendMessage("yes", "dm", activeChat, activeChat);
                }}
                onDeclineOffer={async () => {
                  markRead(activeChat);
                  await sendMessage("no", "dm", activeChat, activeChat);
                }}
              />
            )}
          </div>
        )}

        {section === "schedule" && (
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScheduleBoard state={visibleState} />
          </div>
        )}

        {section === "audit" && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)] p-4">
            <AgentActivity state={visibleState} />
          </div>
        )}

        {/* Wide desktop activity side panel (chats only; unique audit-log testid) */}
        {isChats && (
          <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-[var(--divider)] bg-white p-4 xl:block">
            <AgentActivity state={visibleState} panel />
          </aside>
        )}
      </div>

      <BottomTabs
        section={section}
        hidden={isChats && mobileInConvo}
        onSelect={(s) => {
          setSection(s);
          setMobileInConvo(false);
        }}
      />
    </div>
  );
}
