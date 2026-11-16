// ShiftFix — written by IBM Bob
// Mac-style phone frame wrapper for the 3-phone demo layout.
// Tab state is lifted to the parent so all 3 phones navigate together.

import type { ReactNode } from "react";

export type PhoneTab = "chat" | "map" | "members" | "schedule";

interface Props {
  personaName: string;
  personaColor: string;
  carrier?: string;
  /** Chat panel content */
  children: ReactNode;
  /** Schedule panel content — rendered on the Schedule tab */
  scheduleContent?: ReactNode;
  badge?: number;
  isActive?: boolean;
  /** Shared tab controlled by parent */
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
}

// GroupMe members placeholder panel
function MembersPanel({ color }: { color: string }) {
  const members = [
    { name: "Amanda", sub: "barista · Mon–Fri" },
    { name: "Arlo", sub: "barista · flexible" },
    { name: "Jordan", sub: "barista · Mon–Fri" },
    { name: "Manager", sub: "floor manager" },
    { name: "ShiftFix", sub: "AI · shift coverage bot", isBot: true },
  ];
  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white px-4 py-3">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
        {members.length} members
      </p>
      <ul className="space-y-0.5">
        {members.map(({ name, sub, isBot }) => (
          <li key={name} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: isBot ? "#0d9488" : color }}
            >
              {name[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-800">{name}</p>
              <p className="text-[11px] text-gray-400">{sub}</p>
            </div>
            {isBot && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal-700">
                Bot
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// GroupMe map placeholder panel
function MapPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#e8ead6] gap-3">
      <svg width="220" height="160" viewBox="0 0 220 160" aria-hidden className="rounded-xl opacity-80">
        <rect width="220" height="160" fill="#e8ead6"/>
        <line x1="0" y1="80" x2="220" y2="80" stroke="#fff" strokeWidth="6"/>
        <line x1="110" y1="0" x2="110" y2="160" stroke="#fff" strokeWidth="6"/>
        <line x1="0" y1="40" x2="220" y2="40" stroke="#fff" strokeWidth="3" opacity="0.6"/>
        <line x1="0" y1="120" x2="220" y2="120" stroke="#fff" strokeWidth="3" opacity="0.6"/>
        <line x1="55" y1="0" x2="55" y2="160" stroke="#fff" strokeWidth="3" opacity="0.6"/>
        <line x1="165" y1="0" x2="165" y2="160" stroke="#fff" strokeWidth="3" opacity="0.6"/>
        <rect x="8" y="8" width="40" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="60" y="8" width="44" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="116" y="8" width="40" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="8" y="48" width="40" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="116" y="48" width="40" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="8" y="90" width="40" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="60" y="90" width="44" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="116" y="90" width="40" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="170" y="90" width="42" height="26" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="8" y="130" width="40" height="24" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <rect x="116" y="130" width="40" height="24" rx="3" fill="#d4d6c8" opacity="0.7"/>
        <circle cx="110" cy="80" r="10" fill="#E74C3C"/>
        <circle cx="110" cy="80" r="4" fill="white"/>
      </svg>
      <p className="text-[12px] font-semibold text-gray-500">Shared location</p>
      <p className="text-[11px] text-gray-400">Cafe crew · Tap to open Maps</p>
    </div>
  );
}

const TABS: { id: PhoneTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "map", label: "Map" },
  { id: "members", label: "Members" },
  { id: "schedule", label: "Schedule" },
];

export function PhoneFrame({
  personaName,
  personaColor,
  carrier = "ShiftFix",
  children,
  scheduleContent,
  badge = 0,
  isActive = false,
  activeTab,
  onTabChange,
}: Props) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[2.6rem] shadow-[0_30px_80px_rgba(0,0,0,0.28)] ring-[7px] transition-all duration-300 ${
        isActive ? "ring-white/90 scale-[1.02]" : "ring-[#2a2a2a] scale-100"
      }`}
      style={{ background: "#1a1a1a", width: 280, minHeight: 560, maxHeight: 680 }}
    >
      {/* Dynamic island notch */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <div className="h-[26px] w-[90px] rounded-full bg-black" />
      </div>

      {/* Status bar */}
      <div
        className="relative z-10 flex items-center justify-between px-6 pt-[46px] pb-1 text-white/90 text-[11px] font-semibold tracking-tight"
        style={{ background: personaColor }}
      >
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden>
            <rect x="0" y="4" width="3" height="7" rx="0.5" opacity="0.4"/>
            <rect x="4" y="2.5" width="3" height="8.5" rx="0.5" opacity="0.6"/>
            <rect x="8" y="1" width="3" height="10" rx="0.5" opacity="0.8"/>
            <rect x="12" y="0" width="3" height="11" rx="0.5"/>
          </svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
            <path d="M8 2.4C5.6 2.4 3.4 3.4 1.8 5L0 3.2C2.1 1.2 4.9 0 8 0s5.9 1.2 8 3.2L14.2 5C12.6 3.4 10.4 2.4 8 2.4z" opacity="0.4"/>
            <path d="M8 5.4C6.5 5.4 5.1 6 4.1 7L2.3 5.2C3.8 3.8 5.8 3 8 3s4.2.8 5.7 2.2L11.9 7C10.9 6 9.5 5.4 8 5.4z" opacity="0.7"/>
            <circle cx="8" cy="9.5" r="1.5"/>
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="currentColor" aria-hidden>
            <rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
            <rect x="22.5" y="4" width="2" height="4" rx="1" opacity="0.5"/>
            <rect x="1.5" y="2.5" width="17" height="7" rx="1.5" opacity="0.9"/>
          </svg>
        </div>
      </div>

      {/* GroupMe-style nav header */}
      <div
        className="z-10 flex items-center gap-2 px-3 py-2 text-white"
        style={{ background: personaColor }}
      >
        {/* Back chevron */}
        <button
          type="button"
          aria-label="Back"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 active:bg-white/20"
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" aria-hidden>
            <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Avatar stack */}
        <div className="flex -space-x-2 shrink-0">
          {["A", "J", "M"].map((l) => (
            <div
              key={l}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/30 text-[11px] font-bold text-white"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              {l}
            </div>
          ))}
        </div>
        {/* Title + subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-bold leading-tight">{personaName}</p>
            {badge > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-white/75">{carrier}</p>
        </div>
        {/* Gear */}
        <button
          type="button"
          aria-label="Settings"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.32.07-.65.07-.98 0-.33-.03-.67-.07-1l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.33-.07.67-.07 1 0 .33.03.65.07.98l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
          </svg>
        </button>
      </div>

      {/* Tab bar — Chat / Map / Members / Schedule */}
      <div
        className="z-10 flex overflow-x-auto border-b border-white/20 scrollbar-none"
        style={{ background: personaColor }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex-1 whitespace-nowrap py-2 text-[11px] font-bold uppercase tracking-wide transition-all min-w-0 ${
              activeTab === id
                ? "border-b-2 border-white text-white"
                : "text-white/55 hover:text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
        {activeTab === "chat" ? children : null}
        {activeTab === "map" ? <MapPanel /> : null}
        {activeTab === "members" ? <MembersPanel color={personaColor} /> : null}
        {activeTab === "schedule" ? (
          <div className="flex-1 overflow-y-auto p-4">
            {scheduleContent ?? (
              <p className="text-center text-sm text-gray-400 pt-8">No schedule data</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center bg-white py-2">
        <div className="h-1 w-28 rounded-full bg-black/20" />
      </div>
    </div>
  );
}
