import { Avatar } from "@/components/chat/Avatar";
import type { Employee, Message } from "@/lib/types";

interface Props {
  message: Message;
  sender: Employee | undefined;
  isOwn: boolean;
  showHeader: boolean;
  timeLabel?: string;
}

const NAME_COLORS = [
  "#0D9488",
  "#E74C3C",
  "#2563EB",
  "#8E44AD",
  "#D35400",
  "#059669",
];

function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

export function MessageBubble({
  message,
  sender,
  isOwn,
  showHeader,
  timeLabel,
}: Props) {
  const isBot = Boolean(sender?.isBot);
  const name = sender?.name ?? "Unknown";

  return (
    <div
      className={`bubble-in flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`msg-${message.id}`}
    >
      <div className={`w-9 shrink-0 ${showHeader ? "visible" : "invisible"}`}>
        {!isOwn ? <Avatar name={name} isBot={isBot} size="sm" /> : null}
      </div>

      <div className={`flex max-w-[78%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {showHeader && !isOwn ? (
          <div className="mb-0.5 flex items-center gap-1.5 px-1">
            <span className="text-xs font-semibold" style={{ color: nameColor(name) }}>
              {name}
            </span>
            {isBot ? (
              <span
                className="rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
                style={{ background: "var(--ai)" }}
                data-testid="ai-badge"
              >
                AI
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          className={`px-3 py-2 text-[15px] leading-snug ${
            isOwn
              ? "rounded-[18px] rounded-br-[5px] bg-[var(--accent)] text-white"
              : isBot
                ? "rounded-[18px] rounded-bl-[5px] bg-teal-50 text-teal-950 ring-1 ring-teal-200"
                : "rounded-[18px] rounded-bl-[5px] bg-[var(--inbound)] text-[var(--ink)]"
          }`}
        >
          {message.text}
        </div>
        {timeLabel ? (
          <span className="mt-0.5 px-1 text-[10px] text-[var(--ink-muted)]">{timeLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

/** @deprecated alias for older imports */
export { MessageBubble as ChatBubble };
