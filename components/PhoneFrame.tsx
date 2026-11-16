// ShiftFix — written by IBM Bob
// Mac-style phone frame wrapper for the 3-phone demo layout.

interface Props {
  personaName: string;
  personaColor: string; // tailwind bg class or hex
  carrier?: string;
  children: React.ReactNode;
  badge?: number; // unread count
  isActive?: boolean;
}

export function PhoneFrame({
  personaName,
  personaColor,
  carrier = "ShiftFix",
  children,
  badge = 0,
  isActive = false,
}: Props) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[2.6rem] shadow-[0_30px_80px_rgba(0,0,0,0.28)] ring-[7px] transition-all duration-300 ${
        isActive
          ? "ring-white/90 scale-[1.02]"
          : "ring-[#2a2a2a] scale-100"
      }`}
      style={{ background: "#1a1a1a", width: 280, minHeight: 560, maxHeight: 680 }}
    >
      {/* Dynamic island notch */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <div className="h-[26px] w-[90px] rounded-full bg-black" />
      </div>

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-[46px] pb-1 text-white/90 text-[11px] font-semibold tracking-tight"
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

      {/* App chrome - header */}
      <div
        className="z-10 px-4 py-2.5 text-white"
        style={{ background: personaColor }}
      >
        <p className="text-center text-[11px] font-medium text-white/80 tracking-wide">{carrier}</p>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <p className="text-center text-[17px] font-bold tracking-tight">{personaName}</p>
          {badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black text-white shadow-lg animate-bounce">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
      </div>

      {/* Chat body */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
        {children}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center bg-white py-2">
        <div className="h-1 w-28 rounded-full bg-black/20" />
      </div>
    </div>
  );
}
