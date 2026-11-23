"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { OfferCard } from "@/components/chat/OfferCard";
import { SystemCard } from "@/components/chat/SystemCard";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ShiftFixMark } from "@/components/brand/ShiftFixMark";
import { classifyMessage } from "@/lib/chat/messageKind";
import { formatShiftWindow } from "@/lib/coverage/time";
import type { DemoState, Employee, Message, Offer } from "@/lib/types";

interface Props {
  title: string;
  subtitle?: string;
  isGroup?: boolean;
  messages: Message[];
  employees: Employee[];
  currentUserId: string;
  botId?: string;
  pendingOffer?: Offer | null;
  offerShiftRole?: string;
  offerWindow?: { start: string; end: string };
  dayLabel?: string;
  typing?: boolean;
  disabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onSend: (text: string) => Promise<void>;
  onAcceptOffer?: () => void;
  onDeclineOffer?: () => void;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayDividerLabel(iso: string, demoMonday?: string): string {
  const d = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (d === today) return "Today";
  if (demoMonday && d === demoMonday) return "Monday";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function Conversation({
  title,
  subtitle,
  isGroup,
  messages,
  employees,
  currentUserId,
  botId,
  pendingOffer,
  offerShiftRole = "barista",
  offerWindow,
  dayLabel = "Monday",
  typing,
  disabled,
  showBack,
  onBack,
  onSend,
  onAcceptOffer,
  onDeclineOffer,
}: Props) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  let lastDay = "";
  const lastOfferIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      const sender = byId.get(m.senderId);
      const isBot = Boolean(sender?.isBot) || m.senderId === botId;
      if (
        classifyMessage(m, {
          isBot,
          pendingOffer: pendingOffer && isBot ? pendingOffer : null,
        }) === "offer"
      ) {
        return i;
      }
    }
    return -1;
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface)]" data-testid="chat-panel">
      <header className="safe-pt flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--divider)] bg-white px-3 py-2">
        {showBack ? (
          <button
            type="button"
            data-testid="chat-back"
            aria-label="Back"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-[var(--ink)]"
          >
            ←
          </button>
        ) : null}
        {isGroup ? <ShiftFixMark size={36} /> : <Avatar name={title} size="md" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[var(--ink)]">{title}</p>
          {subtitle ? (
            <p className="truncate text-[12px] text-[var(--ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div
        ref={scroller}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
        data-testid="chat-messages"
      >
        {messages.length === 0 && !typing ? (
          <p className="pt-10 text-center text-sm text-[var(--ink-muted)]">No messages yet</p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showHeader = !prev || prev.senderId !== m.senderId;
            const sender = byId.get(m.senderId);
            const isBot = Boolean(sender?.isBot) || m.senderId === botId;
            const kind = classifyMessage(m, {
              isBot,
              pendingOffer: pendingOffer && isBot ? pendingOffer : null,
            });
            const d = dayKey(m.createdAt);
            const showDay = d !== lastDay;
            lastDay = d;
            const showOfferCard = kind === "offer" && i === lastOfferIdx;

            return (
              <div key={m.id}>
                {showDay ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[var(--ink-muted)] shadow-sm">
                      {dayDividerLabel(m.createdAt)}
                    </span>
                  </div>
                ) : null}
                {kind === "system" ? (
                  <SystemCard text={m.text} />
                ) : kind === "offer" ? (
                  <div className="flex justify-start">
                    <div className="space-y-2">
                      {showHeader && isBot ? (
                        <div className="mb-0.5 flex items-center gap-1.5 px-1">
                          <span className="text-xs font-semibold text-[var(--accent)]">ShiftFix</span>
                          <span
                            className="rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
                            style={{ background: "var(--ai)" }}
                            data-testid="ai-badge"
                          >
                            AI
                          </span>
                        </div>
                      ) : null}
                      <p className="max-w-[85%] rounded-[18px] rounded-bl-[5px] bg-teal-50 px-3 py-2 text-[15px] text-teal-950 ring-1 ring-teal-200">
                        {m.text}
                      </p>
                      {showOfferCard ? (
                        <OfferCard
                          role={offerShiftRole}
                          dayLabel={dayLabel}
                          windowLabel={
                            offerWindow
                              ? formatShiftWindow(offerWindow.start, offerWindow.end)
                              : "shift window"
                          }
                          status={pendingOffer?.status ?? "pending"}
                          disabled={!pendingOffer || pendingOffer.status !== "pending"}
                          onAccept={onAcceptOffer}
                          onDecline={onDeclineOffer}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <MessageBubble
                    message={m}
                    sender={sender}
                    isOwn={m.senderId === currentUserId}
                    showHeader={showHeader}
                    timeLabel={timeLabel(m.createdAt)}
                  />
                )}
              </div>
            );
          })
        )}
        {typing ? <TypingIndicator /> : null}
      </div>

      <ChatComposer onSend={onSend} disabled={disabled} />
    </div>
  );
}

export function pickMessages(
  state: DemoState,
  channel: "group" | "dm",
  dmPeerId?: string,
): Message[] {
  return state.messages
    .filter((m) => {
      if (m.channel !== channel) return false;
      if (channel === "dm") return m.dmPeerId === dmPeerId;
      return true;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
