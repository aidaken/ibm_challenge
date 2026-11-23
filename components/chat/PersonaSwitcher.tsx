"use client";

import { Avatar } from "@/components/chat/Avatar";
import type { Employee } from "@/lib/types";

interface Props {
  employees: Employee[];
  currentId: string;
  onSelect: (id: string) => void;
}

export function PersonaSwitcher({ employees, currentId, onSelect }: Props) {
  const humans = employees.filter((e) => !e.isBot && !e.isManager);
  const manager = employees.find((e) => e.isManager);
  const current = employees.find((e) => e.id === currentId);

  return (
    <div className="flex items-center gap-2" data-testid="persona-switcher">
      <Avatar name={current?.name ?? "?"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Viewing as
        </p>
        <select
          data-testid="persona-select-ui"
          value={currentId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full truncate bg-transparent text-sm font-semibold text-[var(--ink)] outline-none"
          aria-label="Viewing as"
        >
          {humans.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
          {manager && <option value={manager.id}>{manager.name}</option>}
        </select>
      </div>
    </div>
  );
}
