// ShiftFix — written by IBM Bob

"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { DemoState, Employee, Message } from "@/lib/types";

interface Props {
  title: string;
  subtitle?: string;
  messages: Message[];
  employees: Employee[];
  currentUserId: string;
  onSend: (text: string) => Promise<void>;
  emptyHint?: string;
  memberCount?: number;
}

export function ChatPanel({
  title,
  subtitle,
  messages,
  employees,
  currentUserId,
  onSend,
  emptyHint,
  memberCount,
}: Props) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      className="flex h-[min(72vh,640px)] min-h-[480px] flex-col overflow-hidden bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] ring-1 ring-black/5 sm:rounded-2xl"
      data-testid="chat-panel"
    >
      <header className="flex items-center gap-3 bg-[var(--crew-blue)] px-3 py-3 text-white">
        <div className="flex -space-x-2">
          {employees
            .filter((e) => !e.isManager || e.isBot)
            .slice(0, 3)
            .map((e) => (
              <div key={e.id} className="ring-2 ring-[var(--crew-blue)]">
                <Avatar name={e.name} isBot={e.isBot} size="sm" />
              </div>
            ))}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-tight">{title}</h2>
          <p className="truncate text-[11px] text-white/85">
            {subtitle ??
              (memberCount ? `${memberCount} people` : "Crew chat")}
          </p>
        </div>
      </header>

      <div
        ref={scroller}
        className="flex-1 space-y-2 overflow-y-auto bg-white px-3 py-4"
        data-testid="chat-messages"
      >
        {messages.length === 0 ? (
          <p className="pt-10 text-center text-sm text-[var(--ink-muted)]">
            {emptyHint ?? "No messages yet"}
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showHeader = !prev || prev.senderId !== m.senderId;
            return (
              <ChatBubble
                key={m.id}
                message={m}
                sender={byId.get(m.senderId)}
                isOwn={m.senderId === currentUserId}
                showHeader={showHeader}
              />
            );
          })
        )}
      </div>

      <ChatComposer onSend={onSend} />
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
