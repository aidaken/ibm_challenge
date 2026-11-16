// ShiftFix — written by IBM Bob
// Circular gradient initials — GroupMe-style friendly faces, our own colors.

const PALETTE: Array<[string, string]> = [
  ["#00AFF0", "#0077B5"],
  ["#FF6B6B", "#FF8E53"],
  ["#2ECC71", "#1ABC9C"],
  ["#9B59B6", "#6C5CE7"],
  ["#F39C12", "#E67E22"],
  ["#0D9488", "#0F766E"],
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

interface Props {
  name: string;
  isBot?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, isBot, size = "md" }: Props) {
  const [a, b] = isBot
    ? (["#0D9488", "#115E59"] as const)
    : PALETTE[hashName(name) % PALETTE.length];
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const dim =
    size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${dim}`}
      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
      aria-hidden
    >
      {initial}
      {isBot ? (
        <span className="absolute -bottom-0.5 -right-0.5 rounded bg-teal-700 px-1 text-[8px] font-black leading-none text-white ring-2 ring-white">
          AI
        </span>
      ) : null}
    </div>
  );
}
