// ShiftFix — written by IBM Bob

"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { DemoState, Employee, Message } from "@/lib/types";

interface Props {
  messages: Message[];
  employees: Employee[];
  currentUserId: string;
  onSend: (text: string) => Promise<void>;
  emptyHint?: string;
  typing?: boolean;
  disabled?: boolean;
}

export function ChatPanel({
  messages,
  employees,
  currentUserId,
  onSend,
  emptyHint,
  typing = false,
  disabled = false,
}: Props) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      data-testid="chat-panel"
    >
      <div
        ref={scroller}
        className="flex-1 space-y-2 overflow-y-auto bg-white px-3 py-3"
        data-testid="chat-messages"
      >
        {messages.length === 0 && !typing ? (
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
