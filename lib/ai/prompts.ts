// ShiftFix — written by IBM Bob
// Language-only prompts for Granite. Decisions stay in TypeScript.

export function buildInterpreterPrompt(message: string, context: string): string {
  return `You are ShiftFix, a cafe shift-coverage agent language interpreter.
Read the worker or manager message and return ONLY valid JSON with this shape:
{"intent":"call_out"|"accept"|"decline"|"question"|"other"|"confirm","shift_ref":"optional string","confidence":0.0-1.0}

Rules:
- call_out: worker cannot make their shift / needs cover
- accept: worker agrees to cover
- decline: worker refuses cover
- confirm: manager approves the cover
- question: asking for info
- other: anything else
- confidence < 0.7 if unclear

Context:
${context}

Message:
"""${message}"""

JSON only:`;
}

export function buildOfferDm(args: {
  candidateName: string;
  callOutName: string;
  dayLabel: string;
  windowLabel: string;
}): string {
  return `hey ${args.candidateName}, since ${args.callOutName} is out, can u cover her on ${args.dayLabel} ${args.windowLabel}?`;
}

export function buildLookingReply(): string {
  return "okay, looking";
}

export function buildCheckingWithManager(): string {
  return "awesome, checking with the manager";
}

export function buildManagerAsk(args: {
  candidateName: string;
  callOutName: string;
  dayLabel: string;
  windowLabel: string;
}): string {
  return `@manager, ${args.candidateName} confirmed he can cover ${args.callOutName} on ${args.dayLabel} ${args.windowLabel}, confirm the cover?`;
}

export function buildConfirmedDm(): string {
  return "you're confirmed";
}

export function buildClarifyReply(): string {
  return "quick check — are you calling out of a shift, accepting a cover, or something else?";
}

export function buildEscalatedReply(skipReasons: string[]): string {
  const tried = skipReasons.length
    ? ` Tried: ${skipReasons.join("; ")}.`
    : "";
  return `couldn't find cover automatically.${tried} Manager, please step in.`;
}
