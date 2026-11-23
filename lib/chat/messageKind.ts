import type { Message, Offer } from "@/lib/types";

export type UiMessageKind = "text" | "offer" | "system";

/** Heuristic classification for rich chat cards (no schema change required). */
export function classifyMessage(
  message: Message,
  opts?: { isBot?: boolean; pendingOffer?: Offer | null },
): UiMessageKind {
  const text = message.text.toLowerCase();
  if (
    opts?.isBot &&
    (/is covered/.test(text) ||
      /^covered[ —-]/.test(text) ||
      /no action needed/.test(text))
  ) {
    return "system";
  }
  if (
    opts?.isBot &&
    (/can (u|you) cover/.test(text) || opts.pendingOffer)
  ) {
    return "offer";
  }
  return "text";
}

export function isSmallTalk(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/[!.,]+$/g, "");
  return /^(thanks|thank you|thank u|thanks guys|thank u guys|thx|ty|ok|okay|k|lol|lmao|haha|cool|great|awesome|np|no problem|anytime|cheers)$/i.test(
    t,
  );
}
