// ShiftFix — written by IBM Bob

import type { Employee, Message } from "@/lib/types";

interface Props {
  message: Message;
  sender: Employee | undefined;
}

export function ChatBubble({ message, sender }: Props) {
  const isBot = Boolean(sender?.isBot);
  const name = sender?.name ?? "Unknown";

  return (
    <div
      className={`flex flex-col gap-0.5 ${isBot ? "items-start" : "items-start"}`}
      data-testid={`msg-${message.id}`}
    >
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-xs font-semibold text-slate-700">{name}</span>
        {isBot ? (
          <span
            className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            data-testid="ai-badge"
          >
            AI
          </span>
        ) : null}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
          isBot
            ? "bg-teal-50 text-teal-950 ring-1 ring-teal-200"
            : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
