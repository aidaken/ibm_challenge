// ShiftFix — written by IBM Bob
// Animated 3-dot typing indicator, GroupMe style.

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-1" data-testid="typing-indicator">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-white text-[11px] shadow-sm"
        style={{ background: "linear-gradient(145deg, #0D9488, #115E59)" }}
        aria-hidden
      >
        S
      </div>
      <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[5px] bg-teal-50 px-3 py-2.5 ring-1 ring-teal-200">
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: "0.18s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.36s" }} />
      </div>
    </div>
  );
}
