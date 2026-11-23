"use client";

import { Avatar } from "@/components/chat/Avatar";
import { ShiftFixMark } from "@/components/brand/ShiftFixMark";

export interface ChatRowData {
  id: string;
  title: string;
  preview: string;
  timeLabel: string;
  unread: number;
  isGroup?: boolean;
  pinned?: boolean;
  testId?: string;
}

interface Props {
  row: ChatRowData;
  active: boolean;
  onSelect: () => void;
}

export function ChatRow({ row, active, onSelect }: Props) {
  return (
    <button
      type="button"
      data-testid={row.testId ?? `chat-row-${row.id}`}
      onClick={onSelect}
      className={`flex w-full min-h-[64px] items-center gap-3 px-3 py-2.5 text-left transition ${
        active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface)]"
      }`}
    >
      {row.isGroup ? (
        <ShiftFixMark size={40} />
      ) : (
        <Avatar name={row.title} size="md" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-[var(--ink)]">
            {row.title}
            {row.pinned ? (
              <span className="ml-1 text-[10px] font-bold uppercase text-[var(--ink-muted)]">
                pinned
              </span>
            ) : null}
          </p>
          <span className="shrink-0 text-[11px] text-[var(--ink-muted)]">{row.timeLabel}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-[13px] text-[var(--ink-muted)]">{row.preview}</p>
          {row.unread > 0 ? (
            <span
              data-testid={`unread-${row.id}`}
              className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-black text-white"
            >
              {row.unread > 9 ? "9+" : row.unread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
