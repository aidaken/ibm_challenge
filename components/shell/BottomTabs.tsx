"use client";

import type { ShellSection } from "@/components/shell/LeftRail";

interface Props {
  section: ShellSection;
  onSelect: (s: ShellSection) => void;
  hidden?: boolean;
}

const TABS: { id: ShellSection; label: string; testId: string }[] = [
  { id: "chats", label: "Chats", testId: "bottom-tab-chats" },
  { id: "schedule", label: "Schedule", testId: "bottom-tab-schedule" },
  { id: "audit", label: "Activity", testId: "bottom-tab-audit" },
];

export function BottomTabs({ section, onSelect, hidden }: Props) {
  if (hidden) return null;
  return (
    <nav
      data-testid="bottom-tabs"
      className="safe-pb flex shrink-0 border-t border-[var(--divider)] bg-white lg:hidden"
    >
      {TABS.map((t) => {
        const active = section === t.id;
        return (
          <button
            key={t.id}
            type="button"
            data-testid={t.testId}
            onClick={() => onSelect(t.id)}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              active ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
