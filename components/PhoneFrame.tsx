// ShiftFix — written by IBM Bob
// Mac-style phone frame — fully self-contained navigation.
// Back (←) goes to the GroupMe conversation list screen.
// Each phone has its own independent tab state.

"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export type PhoneTab = "chat" | "map" | "members" | "schedule";

interface Convo {
  name: string;
  preview: string;
  time: string;
  unread?: number;
  isGroup?: boolean;
}

interface Props {
  personaName: string;
  personaColor: string;
  carrier?: string;
  children: ReactNode;
  scheduleContent?: ReactNode;
  badge?: number;
}

// ── Inner panels ────────────────────────────────────────────────────────────

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

// ── Home screen: GroupMe conversation list ──────────────────────────────────

function HomeScreen({
  color,
  convos,
  onOpen,
}: {
  color: string;
  convos: Convo[];
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white overflow-hidden">
      {/* Search bar */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-white rounded-full border border-gray-200 px-3 py-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" aria-hidden>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="text-[13px] text-gray-400">Search</span>
        </div>
      </div>

      {/* Conversation list */}
      <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {convos.map((c, i) => (
          <li key={c.name}>
            <button
              type="button"
              onClick={i === 0 ? onOpen : undefined}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              {/* Avatar */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
                style={{ background: i === 0 ? color : ["#E74C3C","#8E44AD","#F39C12","#27AE60"][i % 4] }}
              >
                {c.name[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[14px] font-semibold text-gray-900">{c.name}</p>
                  <span className="shrink-0 text-[11px] text-gray-400">{c.time}</span>
                </div>
                <p className="truncate text-[12px] text-gray-500 mt-0.5">{c.preview}</p>
              </div>
              {c.unread ? (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-black text-white"
                  style={{ background: color }}>
                  {c.unread}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {/* Bottom nav bar */}
      <div className="flex border-t border-gray-100 bg-white">
        {[
          { label: "Chats", active: true, icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" },
          { label: "Contacts", active: false, icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" },
          { label: "Settings", active: false, icon: "M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.32.07-.65.07-.98 0-.33-.03-.67-.07-1l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.33-.07.67-.07 1 0 .33.03.65.07.98l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z" },
        ].map(({ label, active, icon }) => (
          <button key={label} type="button" className="flex flex-1 flex-col items-center gap-0.5 py-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : "#9ca3af"} aria-hidden>
              <path d={icon}/>
            </svg>
            <span className="text-[9px] font-semibold" style={{ color: active ? color : "#9ca3af" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tab constants ────────────────────────────────────────────────────────────

const TABS: { id: PhoneTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "map", label: "Map" },
  { id: "members", label: "Members" },
  { id: "schedule", label: "Schedule" },
];

// ── PhoneFrame ───────────────────────────────────────────────────────────────

export function PhoneFrame({
  personaName,
  personaColor,
  carrier = "GroupMe",
  children,
  scheduleContent,
  badge = 0,
}: Props) {
  // "home" = conversation list; "conversation" = inside a chat
  const [screen, setScreen] = useState<"home" | "conversation">("conversation");
  const [activeTab, setActiveTab] = useState<PhoneTab>("chat");

  const convos: Convo[] = [
    { name: personaName, preview: "ShiftFix is in this chat", time: "now", unread: badge, isGroup: true },
    { name: "Jordan", preview: "Hey are you working Saturday?", time: "2h" },
    { name: "Manager", preview: "Schedule updated for next week", time: "Mon" },
    { name: "Staff", preview: "Who wants extra hours?", time: "Sun", unread: 3 },
  ];

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-[2.6rem] shadow-[0_30px_80px_rgba(0,0,0,0.28)] ring-[7px] ring-[#2a2a2a]"
      style={{ background: "#1a1a1a", width: 280, minHeight: 560, maxHeight: 680 }}
    >
      {/* Dynamic island */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <div className="h-[26px] w-[90px] rounded-full bg-black" />
      </div>

      {/* Status bar */}
      <div
        className="relative z-10 flex items-center justify-between px-6 pt-[46px] pb-1 text-white/90 text-[11px] font-semibold tracking-tight"
        style={{ background: screen === "conversation" ? personaColor : "#ffffff" }}
      >
        <span style={{ color: screen === "home" ? "#111" : undefined }}>9:41</span>
        <div className="flex items-center gap-1.5" style={{ color: screen === "home" ? "#555" : undefined }}>
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

      {/* ── HOME screen: GroupMe list header ── */}
      {screen === "home" && (
        <div className="z-10 flex items-center justify-between bg-white px-4 py-2 border-b border-gray-100">
          <p className="text-[18px] font-black text-gray-900">Messages</p>
          <button type="button" aria-label="New chat"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── CONVERSATION screen: GroupMe nav header + tabs ── */}
      {screen === "conversation" && (
        <>
          <div
            className="z-10 flex items-center gap-2 px-3 py-2 text-white"
            style={{ background: personaColor }}
          >
            {/* Back → goes to home list */}
            <button
              type="button"
              aria-label="Back"
              onClick={() => setScreen("home")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 active:bg-white/20 transition-colors"
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
            {/* Title */}
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
            <button type="button" aria-label="Settings"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.32.07-.65.07-.98 0-.33-.03-.67-.07-1l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.33-.07.67-.07 1 0 .33.03.65.07.98l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
              </svg>
            </button>
          </div>

          {/* Tab bar */}
          <div className="z-10 flex border-b border-white/20" style={{ background: personaColor }}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wide transition-all ${
                  activeTab === id
                    ? "border-b-2 border-white text-white"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Panel body ── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {screen === "home" ? (
          <HomeScreen
            color={personaColor}
            convos={convos}
            onOpen={() => setScreen("conversation")}
          />
        ) : (
          <>
            {activeTab === "chat" ? <div className="flex flex-1 flex-col overflow-hidden bg-white">{children}</div> : null}
            {activeTab === "map" ? <MapPanel /> : null}
            {activeTab === "members" ? <MembersPanel color={personaColor} /> : null}
            {activeTab === "schedule" ? (
              <div className="flex-1 overflow-y-auto bg-white p-3">
                {scheduleContent ?? (
                  <p className="text-center text-sm text-gray-400 pt-8">No schedule data</p>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center bg-white py-2">
        <div className="h-1 w-28 rounded-full bg-black/20" />
      </div>
    </div>
  );
}
