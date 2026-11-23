"use client";

import { useMemo, useState } from "react";
import { ChatRow, type ChatRowData } from "@/components/chat/ChatRow";
import { PersonaSwitcher } from "@/components/chat/PersonaSwitcher";
import type { Employee } from "@/lib/types";

interface Props {
  rows: ChatRowData[];
  activeId: string | null;
  onSelect: (id: string) => void;
  employees: Employee[];
  currentPersonaId: string;
  onPersonaChange: (id: string) => void;
}

export function ChatList({
  rows,
  activeId,
  onSelect,
  employees,
  currentPersonaId,
  onPersonaChange,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.preview.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div
      data-testid="chat-list"
      className="flex h-full w-full flex-col border-r border-[var(--divider)] bg-white md:w-[320px] md:shrink-0"
    >
      <header className="safe-pt shrink-0 border-b border-[var(--divider)] px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-lg font-black tracking-tight text-[var(--ink)]">ShiftFix</h1>
        </div>
        <PersonaSwitcher
          employees={employees}
          currentId={currentPersonaId}
          onSelect={onPersonaChange}
        />
        <input
          data-testid="chat-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="mt-3 w-full rounded-xl border border-[var(--divider)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </header>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((row) => (
          <ChatRow
            key={row.id}
            row={row}
            active={activeId === row.id}
            onSelect={() => onSelect(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
