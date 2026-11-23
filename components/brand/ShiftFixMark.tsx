/** Simple ShiftFix letter mark — not any third-party brand. */
export function ShiftFixMark({ size = 28 }: { size?: number }) {
  return (
    <div
      data-testid="shiftfix-mark"
      className="flex shrink-0 items-center justify-center rounded-xl font-black text-white shadow-sm"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: "linear-gradient(145deg, #0D9488, #115E59)",
      }}
      aria-hidden
    >
      S
    </div>
  );
}
