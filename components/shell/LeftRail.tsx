"use client";

import { ShiftFixMark } from "@/components/brand/ShiftFixMark";

export type ShellSection = "chats" | "schedule" | "audit";

interface Props {
  section: ShellSection;
  onSelect: (s: ShellSection) => void;
  adminSlot: React.ReactNode;
}

const ICONS: { id: ShellSection; label: string; path: string; testId: string }[] = [
  {
    id: "chats",
    label: "Chats",
    testId: "rail-chats",
    path: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    id: "schedule",
    label: "Schedule",
    testId: "rail-schedule",
    path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    id: "audit",
    label: "Activity",
    testId: "rail-audit",
    path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
];

export function LeftRail({ section, onSelect, adminSlot }: Props) {
  return (
    <aside
      data-testid="left-rail"
      className="hidden h-full w-16 shrink-0 flex-col items-center border-r border-[var(--divider)] bg-white py-3 lg:flex"
    >
      <ShiftFixMark size={32} />
      <nav className="mt-6 flex flex-1 flex-col items-center gap-1">
        {ICONS.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={item.testId}
              aria-label={item.label}
              onClick={() => onSelect(item.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              }`}
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
              </svg>
            </button>
          );
        })}
      </nav>
      <div className="pb-1">{adminSlot}</div>
    </aside>
  );
}
