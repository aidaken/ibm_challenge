// ShiftFix — written by IBM Bob

"use client";

import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { DemoState, Employee, Message } from "@/lib/types";

interface Props {
  title: string;
  subtitle?: string;
  messages: Message[];
  employees: Employee[];
  onSend: (text: string) => Promise<void>;
  emptyHint?: string;
}

export function ChatPanel({
  title,
  subtitle,
  messages,
  employees,
  onSend,
  emptyHint,
}: Props) {
  const byId = new Map(employees.map((e) => [e.id, e]));

  return (
    <div
      className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[#e8eef5] shadow-lg ring-1 ring-slate-300"
      data-testid="chat-panel"
    >
      <header className="bg-[#1b6ca8] px-4 py-3 text-white">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-xs text-blue-100">{subtitle}</p> : null}
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4" data-testid="chat-messages">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">{emptyHint ?? "No messages yet"}</p>
        ) : (
          messages.map((m) => (
            <ChatBubble key={m.id} message={m} sender={byId.get(m.senderId)} />
          ))
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
