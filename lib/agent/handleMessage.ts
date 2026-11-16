// ShiftFix — written by IBM Bob
// Orchestrates chat → Granite language → TypeScript coverage decisions.

import {
  interpretMessage,
  needsClarification,
} from "@/lib/ai/granite";
import {
  buildCheckingWithManager,
  buildClarifyReply,
  buildConfirmedDm,
  buildEscalatedReply,
  buildLookingReply,
  buildManagerAsk,
  buildOfferDm,
} from "@/lib/ai/prompts";
import {
  findEligibleCandidates,
  formatShiftWindow,
  rankCandidates,
  transition,
} from "@/lib/coverage";
import { IDS } from "@/lib/db/seed";
import {
  appendAudit,
  appendMessage,
  getActiveCoverageRequest,
  getEmployee,
  getNowIso,
  getShift,
  getShiftFixBot,
  listOffersForRequest,
  updateShift,
  upsertCoverageRequest,
  upsertOffer,
} from "@/lib/db/queries";
import { getState, newId, updateState } from "@/lib/db/store";
import type { CoverageRequest, Intent, Message, Offer, SkipRecord } from "@/lib/types";

const OFFER_TIMEOUT_MS = 10 * 60 * 1000;

export interface HandleMessageInput {
  senderId: string;
  text: string;
  channel: "group" | "dm";
  dmPeerId?: string | null;
}

export interface HandleMessageResult {
  messages: Message[];
  error?: string;
}

function dayLabel(): string {
  return "Monday";
}

function windowLabel(start: string, end: string): string {
  return formatShiftWindow(start, end);
}

function postBot(
  text: string,
  channel: "group" | "dm",
  dmPeerId: string | null = null,
): Message {
  const bot = getShiftFixBot();
  return appendMessage({
    channel,
    dmPeerId,
    senderId: bot.id,
    text,
    graniteIntent: null,
    confidence: null,
  });
}

function findAmandaMondayShift() {
  return getState().shifts.find((s) => s.id === IDS.shiftAmandaMon);
}

function createCoverageRequest(shiftId: string, reason: string): CoverageRequest {
  const now = getNowIso();
  const request: CoverageRequest = {
    id: newId("req"),
    shiftId,
    reason,
    status: "open",
    currentOfferId: null,
    createdAt: now,
    updatedAt: now,
  };
  upsertCoverageRequest(request);
  appendAudit({
    requestId: request.id,
    actor: "worker",
    action: "call_out",
    reason,
  });
  updateShift({
    ...getShift(shiftId)!,
    status: "needs_cover",
  });
  return request;
}

function computeRanking(shiftId: string, excludeIds: string[]) {
  const state = getState();
  const shift = getShift(shiftId);
  if (!shift) throw new Error("Shift not found");
  const result = findEligibleCandidates({
    shift,
    employees: state.employees,
    availability: state.availability,
    allShifts: state.shifts,
    excludeEmployeeIds: excludeIds,
  });
  const ranked = rankCandidates(result.eligible);
  return { ranked, skipped: result.skipped, shift };
}

function recordSkips(requestId: string, skipped: SkipRecord[]): void {
  for (const skip of skipped) {
    appendAudit({
      requestId,
      actor: "agent",
      action: "skip_candidate",
      reason: skip.reason,
    });
  }
}

function sendNextOffer(request: CoverageRequest, alreadyTried: string[]): void {
  const { ranked, skipped } = computeRanking(request.shiftId, [
    getShift(request.shiftId)!.employeeId,
    ...alreadyTried,
  ]);
  recordSkips(request.id, skipped);

  const next = ranked.find((c) => !alreadyTried.includes(c.employee.id));
  if (!next) {
    const from = request.status;
    const action = from === "open" ? "no_candidates" : "exhausted";
    const status = transition(from === "pending_approval" ? "pending_approval" : from, action);
    upsertCoverageRequest({
      ...request,
      status,
      currentOfferId: null,
      updatedAt: getNowIso(),
    });
    appendAudit({
      requestId: request.id,
      actor: "agent",
      action: "escalated",
      reason: "No eligible candidates left",
    });
    postBot(buildEscalatedReply(skipped.map((s) => s.reason)), "group", null);
    return;
  }

  const now = getNowIso();
  const offer: Offer = {
    id: newId("offer"),
    requestId: request.id,
    employeeId: next.employee.id,
    rank: listOffersForRequest(request.id).filter((o) => o.status !== "skipped").length + 1,
    status: "pending",
    sentAt: now,
    answeredAt: null,
    expiresAt: new Date(Date.parse(now) + OFFER_TIMEOUT_MS).toISOString(),
    skipReason: null,
  };
  upsertOffer(offer);

  let status = request.status;
  if (status === "open") {
    status = transition(status, "start_offering");
  } else if (status === "offering") {
    status = transition(status, "next_candidate");
  } else if (status === "pending_approval") {
    status = transition(status, "manager_rejects");
  }

  upsertCoverageRequest({
    ...request,
    status,
    currentOfferId: offer.id,
    updatedAt: now,
  });

  const candidate = next.employee;
  const shift = getShift(request.shiftId)!;
  const callOut = getEmployee(shift.employeeId)!;

  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "offer_sent",
    reason: `Offered to ${candidate.name} (rank ${offer.rank})`,
  });

  postBot(
    buildOfferDm({
      candidateName: candidate.name,
      callOutName: callOut.name,
      dayLabel: dayLabel(),
      windowLabel: windowLabel(shift.start, shift.end),
    }),
    "dm",
    candidate.id,
  );
}

async function handleCallOut(senderId: string, text: string, intent: Intent, confidence: number) {
  const shift = findAmandaMondayShift();
  if (!shift) {
    postBot("I couldn't find that shift on the schedule.", "group");
    return;
  }
  if (senderId !== shift.employeeId) {
    // Demo is wired to Amanda's Monday shift; still allow if Amanda posts.
    postBot(
      "for this demo, Amanda's Monday barista shift is the call-out target. Amanda should post the call-out.",
      "group",
    );
    return;
  }

  const existing = getActiveCoverageRequest();
  if (existing) {
    postBot("already working a coverage request — hang tight.", "group");
    return;
  }

  postBot(buildLookingReply(), "group");

  const request = createCoverageRequest(shift.id, text);
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "interpreted_call_out",
    reason: `intent=${intent} confidence=${confidence}`,
  });

  sendNextOffer(request, []);
}

async function handleAccept(senderId: string) {
  const request = getActiveCoverageRequest();
  const offers = request ? listOffersForRequest(request.id) : [];
  const current = request?.currentOfferId
    ? offers.find((o) => o.id === request.currentOfferId)
    : undefined;
  // Always reply in the open offer's DM thread so the UI (Arlo DM) shows errors.
  const dmThread = current?.employeeId ?? senderId;

  if (!request || request.status !== "offering" || !current) {
    postBot("no open offer for you right now.", "dm", dmThread);
    return;
  }

  if (current.employeeId !== senderId) {
    postBot(
      `that offer is for ${getEmployee(current.employeeId)?.name ?? "someone else"} — switch to them before saying yes.`,
      "dm",
      dmThread,
    );
    return;
  }

  upsertOffer({
    ...current,
    status: "accepted",
    answeredAt: getNowIso(),
  });

  const status = transition(request.status, "worker_accepts");
  upsertCoverageRequest({
    ...request,
    status,
    updatedAt: getNowIso(),
  });

  appendAudit({
    requestId: request.id,
    actor: "worker",
    action: "offer_accepted",
    reason: `${getEmployee(senderId)?.name ?? senderId} accepted cover`,
  });

  postBot(buildCheckingWithManager(), "dm", senderId);

  const shift = getShift(request.shiftId)!;
  const callOut = getEmployee(shift.employeeId)!;
  const candidate = getEmployee(senderId)!;

  postBot(
    buildManagerAsk({
      candidateName: candidate.name,
      callOutName: callOut.name,
      dayLabel: dayLabel(),
      windowLabel: windowLabel(shift.start, shift.end),
    }),
    "group",
  );

  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "asked_manager",
    reason: `Pending approval for ${candidate.name}`,
  });
}

async function handleDecline(senderId: string) {
  const request = getActiveCoverageRequest();
  if (!request || request.status !== "offering" || !request.currentOfferId) {
    return;
  }
  const offers = listOffersForRequest(request.id);
  const current = offers.find((o) => o.id === request.currentOfferId);
  if (!current || current.employeeId !== senderId) return;

  upsertOffer({
    ...current,
    status: "declined",
    answeredAt: getNowIso(),
  });
  appendAudit({
    requestId: request.id,
    actor: "worker",
    action: "offer_declined",
    reason: `${getEmployee(senderId)?.name} declined`,
  });
  postBot("got it, checking the next person.", "dm", senderId);

  const tried = offers
    .filter((o) => ["declined", "timed_out", "accepted"].includes(o.status) || o.id === current.id)
    .map((o) => o.employeeId);
  sendNextOffer({ ...request, status: "offering" }, tried);
}

async function handleConfirm(senderId: string) {
  const manager = getEmployee(senderId);
  if (!manager?.isManager) {
    postBot("only the manager can confirm a cover.", "group");
    return;
  }

  const request = getActiveCoverageRequest();
  if (!request || request.status !== "pending_approval" || !request.currentOfferId) {
    postBot("nothing waiting on approval right now.", "group");
    return;
  }

  const offer = listOffersForRequest(request.id).find((o) => o.id === request.currentOfferId);
  if (!offer) {
    postBot("offer missing — please reset the demo.", "group");
    return;
  }

  const status = transition(request.status, "manager_approves");
  upsertCoverageRequest({
    ...request,
    status,
    updatedAt: getNowIso(),
  });

  const shift = getShift(request.shiftId)!;
  updateShift({
    ...shift,
    employeeId: offer.employeeId,
    status: "covered",
  });

  updateState((s) => {
    const emp = s.employees.find((e) => e.id === offer.employeeId);
    if (emp) emp.lastPickupAt = getNowIso();
  });

  appendAudit({
    requestId: request.id,
    actor: "manager",
    action: "approved",
    reason: `Manager confirmed ${getEmployee(offer.employeeId)?.name} on the schedule`,
  });

  postBot(buildConfirmedDm(), "dm", offer.employeeId);
  postBot(
    `${dayLabel()} ${windowLabel(shift.start, shift.end)} is now covered by ${getEmployee(offer.employeeId)?.name}.`,
    "group",
  );
}

/** Expire pending offers whose expiresAt <= now, then offer next. */
export function processTimeouts(): { timedOut: number } {
  const now = Date.parse(getNowIso());
  const request = getActiveCoverageRequest();
  if (!request || request.status !== "offering" || !request.currentOfferId) {
    return { timedOut: 0 };
  }
  const offer = listOffersForRequest(request.id).find((o) => o.id === request.currentOfferId);
  if (!offer || offer.status !== "pending") return { timedOut: 0 };
  if (Date.parse(offer.expiresAt) > now) return { timedOut: 0 };

  upsertOffer({ ...offer, status: "timed_out", answeredAt: getNowIso() });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "offer_timed_out",
    reason: `${getEmployee(offer.employeeId)?.name} did not reply in time`,
  });
  postBot("timed out — moving on.", "dm", offer.employeeId);

  const tried = listOffersForRequest(request.id).map((o) => o.employeeId);
  sendNextOffer({ ...getActiveCoverageRequest()!, status: "offering" }, tried);
  return { timedOut: 1 };
}

export async function handleMessage(
  input: HandleMessageInput,
): Promise<HandleMessageResult> {
  const sender = getEmployee(input.senderId);
  if (!sender) {
    return { messages: [], error: "Unknown sender" };
  }
  if (sender.isBot) {
    return { messages: [], error: "Bot cannot post as a human" };
  }

  const channel = input.channel;
  const dmPeerId = channel === "dm" ? (input.dmPeerId ?? input.senderId) : null;

  const userMsg = appendMessage({
    channel,
    dmPeerId,
    senderId: input.senderId,
    text: input.text,
    graniteIntent: null,
    confidence: null,
  });

  const beforeCount = getState().messages.length;

  try {
    const interpretation = await interpretMessage({
      message: input.text,
      context: `channel=${channel}; sender=${sender.name}; role=${sender.roles.join(",")}`,
    });

    updateState((s) => {
      const m = s.messages.find((x) => x.id === userMsg.id);
      if (m) {
        m.graniteIntent = interpretation.intent;
        m.confidence = interpretation.confidence;
      }
    });

    if (needsClarification(interpretation) && interpretation.intent !== "confirm") {
      // confirm from manager with high-confidence mock usually ok; low confidence → clarify
      if (interpretation.confidence < 0.7) {
        postBot(buildClarifyReply(), channel, dmPeerId);
        return { messages: getState().messages.slice(beforeCount - 1) };
      }
    }

    switch (interpretation.intent) {
      case "call_out":
        if (channel !== "group") {
          postBot("post call-outs in the team chat so everyone can see.", "dm", dmPeerId);
          break;
        }
        await handleCallOut(input.senderId, input.text, interpretation.intent, interpretation.confidence);
        break;
      case "accept":
        await handleAccept(input.senderId);
        break;
      case "decline":
        await handleDecline(input.senderId);
        break;
      case "confirm":
        await handleConfirm(input.senderId);
        break;
      case "question":
        postBot(
          "I can help cover a call-out. Try: \"I'm not available for my Monday morning shift\".",
          channel,
          dmPeerId,
        );
        break;
      default:
        postBot(buildClarifyReply(), channel, dmPeerId);
        break;
    }

    return { messages: getState().messages.filter((m) => m.createdAt >= userMsg.createdAt) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown agent error";
    postBot(`something went wrong: ${message}`, channel, dmPeerId);
    return { messages: [], error: message };
  }
}
