// Language-only prompts for Granite. Decisions stay in TypeScript.

// ── Interpretation prompt ────────────────────────────────────────────────────

export interface InterpretContext {
  senderName: string;
  senderRole: string;
  channel: "group" | "dm";
  hasOpenOffer: boolean;
  upcomingShifts: string; // e.g. "Monday 10am-6pm barista"
}

export function buildInterpretPrompt(message: string, ctx: InterpretContext): string {
  const hasOffer = ctx.hasOpenOffer ? "yes" : "no";
  return `You are ShiftFix, a cafe shift-coverage AI. Classify one worker or manager message.

Return ONLY valid JSON matching this schema — no explanation, no markdown:
{"intent":"call_out"|"accept"|"decline"|"partial_availability"|"question"|"other","shift_ref":"optional string","available_from":"optional HH:MM","available_to":"optional HH:MM","confidence":0.0-1.0}

Intent definitions:
- call_out: worker cannot make their scheduled shift and needs someone to cover
- accept: worker agrees to cover a shift that was offered to them
- decline: worker refuses a cover offer
- partial_availability: worker can cover only part of the shift (include available_from/available_to)
- question: asking for information
- other: anything else (including small talk like thanks/ok/lol — use confidence 0.95 for pure acknowledgements)

Confidence guidance:
- Use 0.9+ only when the intent is unambiguous
- Use 0.95 for pure small talk (thanks, ok, lol) as intent other
- Use 0.5-0.7 when you are unsure
- Use <0.7 when the message could mean multiple things
- Do NOT treat "thanks" / "ok" / "lol" as questions

Context:
- Sender: ${ctx.senderName} (${ctx.senderRole})
- Channel: ${ctx.channel}
- Has open cover offer waiting for reply: ${hasOffer}
- Upcoming shifts: ${ctx.upcomingShifts || "none"}

Few-shot examples:
Message: "hey I'm not available for my Monday shift, can someone cover me?"
JSON: {"intent":"call_out","shift_ref":"Monday","confidence":0.95}

Message: "can't make it, kid's sick"
JSON: {"intent":"call_out","confidence":0.92}

Message: "yes"
JSON: {"intent":"accept","confidence":0.93}

Message: "sure i can do it"
JSON: {"intent":"accept","confidence":0.91}

Message: "nah sorry"
JSON: {"intent":"decline","confidence":0.90}

Message: "i can only do till 2"
JSON: {"intent":"partial_availability","available_to":"14:00","confidence":0.88}

Message: "what time is it again?"
JSON: {"intent":"question","confidence":0.85}

Now classify this message:
"${message}"

JSON:`;
}

// ── Write-message prompt ─────────────────────────────────────────────────────

export type MessageKind =
  | "offer_dm"
  | "looking_reply"
  | "confirm_dm"
  | "part_confirm_dm"
  | "group_announcement"
  | "split_announcement"
  | "manager_dm"
  | "clarify"
  | "escalate"
  | "decline_next"
  | "overlap_taken";

export interface MessageFacts {
  kind: MessageKind;
  candidateName?: string;
  callOutName?: string;
  dayLabel?: string;
  windowLabel?: string;
  role?: string;
  coverageDesc?: string;   // for announcements: "Maya (10am-2pm), David (2pm-6pm)"
  skipReasons?: string[];  // for escalate
}

// Required strings that must appear in generated output for each kind
function requiredStrings(facts: MessageFacts): string[] {
  if (facts.dayLabel && facts.windowLabel) {
    return [facts.dayLabel, facts.windowLabel.split(" to ")[0]];
  }
  return [];
}

export function buildWriteMessagePrompt(facts: MessageFacts): string {
  const req = requiredStrings(facts);
  const reqNote = req.length > 0
    ? `\nIMPORTANT: Your reply MUST contain the words: ${req.map((s) => `"${s}"`).join(", ")}.`
    : "";

  const kindInstructions: Record<MessageKind, string> = {
    offer_dm: `Write a short DM offering ${facts.candidateName} a shift cover for ${facts.callOutName}. Include the day and time. Casual, friendly, one sentence.`,
    looking_reply: "Write a short group-chat reply acknowledging that ShiftFix is searching for cover. Two to four words.",
    confirm_dm: `Write a short DM confirming ${facts.candidateName} is on for the shift (${facts.dayLabel} ${facts.windowLabel}).`,
    part_confirm_dm: `Write a short DM confirming ${facts.candidateName} is covering part of the shift (${facts.dayLabel} ${facts.windowLabel}).`,
    group_announcement: `Write a short group-chat message announcing the shift is covered. Mention who is covering and when.`,
    split_announcement: `Write a short group-chat message announcing the shift is split-covered. Mention each person and their time slot.`,
    manager_dm: `Write a short DM to the manager saying the shift is covered and no action is needed. Include the coverage details.`,
    clarify: "Write a short one-sentence clarifying question asking if the sender is calling out, accepting a cover, or something else.",
    escalate: `Write a short group-chat message saying ShiftFix couldn't find cover and the manager needs to step in. Keep it brief.`,
    decline_next: "Write a short DM acknowledging the decline and saying ShiftFix is checking the next person.",
    overlap_taken: "Write a short DM saying the slot was just taken and ShiftFix is finding someone else.",
  };

  return `You are ShiftFix, a cafe shift-coverage AI. Write exactly one short, casual, friendly message. No emojis. No quotation marks around your reply.${reqNote}

Task: ${kindInstructions[facts.kind]}

Facts:
${facts.candidateName ? `- Candidate: ${facts.candidateName}` : ""}
${facts.callOutName ? `- Called out: ${facts.callOutName}` : ""}
${facts.dayLabel ? `- Day: ${facts.dayLabel}` : ""}
${facts.windowLabel ? `- Time: ${facts.windowLabel}` : ""}
${facts.role ? `- Role: ${facts.role}` : ""}
${facts.coverageDesc ? `- Coverage: ${facts.coverageDesc}` : ""}
${facts.skipReasons?.length ? `- Tried: ${facts.skipReasons.join("; ")}` : ""}

Reply (one message, plain text only):`;
}

// ── Explain-decision prompt ──────────────────────────────────────────────────

export interface DecisionFacts {
  action: string;
  candidateName?: string;
  skipReason?: string;
  windowLabel?: string;
  rank?: number;
  splitParts?: string;
  intent?: string;
  confidence?: number;
  provider?: string;
  latencyMs?: number;
}

export function buildExplainDecisionPrompt(facts: DecisionFacts): string {
  const contextLines = [
    facts.action && `Action: ${facts.action}`,
    facts.candidateName && `Person: ${facts.candidateName}`,
    facts.skipReason && `Skip reason: ${facts.skipReason}`,
    facts.windowLabel && `Time window: ${facts.windowLabel}`,
    facts.rank !== undefined && `Rank: ${facts.rank}`,
    facts.splitParts && `Split plan: ${facts.splitParts}`,
    facts.intent && `Detected intent: ${facts.intent}`,
    facts.confidence !== undefined && `Confidence: ${facts.confidence}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are ShiftFix. Write one plain-English sentence (max 15 words) explaining why this scheduling agent action was taken.
No jargon. No emojis. Start with a capital letter.

${contextLines}

One sentence:`;
}

// ── Fallback string templates ────────────────────────────────────────────────
// Used when Granite output fails fact-verification or provider is unreachable.

export function templateOfferDm(args: {
  candidateName: string;
  callOutName: string;
  dayLabel: string;
  windowLabel: string;
}): string {
  return `hey ${args.candidateName}, ${args.callOutName} can't make it — can you cover ${args.dayLabel} ${args.windowLabel}?`;
}

export function templateLookingReply(): string {
  return "okay, looking";
}

export function templateConfirmDm(args: { dayLabel: string; windowLabel: string }): string {
  return `you're confirmed for ${args.dayLabel} ${args.windowLabel}. Thanks!`;
}

export function templateGroupAnnouncement(args: { dayLabel: string; windowLabel: string; name: string }): string {
  return `${args.dayLabel} ${args.windowLabel} is covered by ${args.name}. No action needed.`;
}

export function templateSplitAnnouncement(args: { dayLabel: string; windowLabel: string; coverageDesc: string }): string {
  return `${args.dayLabel} ${args.windowLabel} is covered: ${args.coverageDesc}. No action needed.`;
}

export function templateManagerDm(args: { dayLabel: string; windowLabel: string; coverageDesc: string }): string {
  return `covered — ${args.coverageDesc} for the ${args.dayLabel} ${args.windowLabel} shift. No action needed.`;
}

export function templateClarifyReply(): string {
  return "quick check — are you calling out of a shift, accepting a cover, or something else?";
}

export function templateEscalate(skipReasons: string[]): string {
  const tried = skipReasons.length ? ` Tried: ${skipReasons.join("; ")}.` : "";
  return `couldn't find cover automatically.${tried} Manager, please step in.`;
}

export function templateDeclineNext(): string {
  return "got it, checking the next person.";
}

export function templateOverlapTaken(): string {
  return "sorry, looks like that slot just got taken — checking someone else.";
}

// Legacy exports kept for existing tests
export const buildOfferDm = templateOfferDm;
export const buildLookingReply = templateLookingReply;
export const buildClarifyReply = templateClarifyReply;
export const buildEscalatedReply = templateEscalate;
