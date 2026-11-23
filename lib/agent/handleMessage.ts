// Orchestrates chat → Granite language → TypeScript coverage decisions.

import {
  explainDecision,
  interpretMessage,
  needsClarification,
  writeMessage,
} from "@/lib/ai/granite";
import type { InterpretContext } from "@/lib/ai/prompts";
import {
  findEligibleCandidates,
  formatShiftWindow,
  rankCandidates,
  transition,
} from "@/lib/coverage";
import { computeSplitPlans } from "@/lib/coverage/split";
import { IDS } from "@/lib/db/seed";
import {
  appendAudit,
  appendMessage,
  getActiveCoverageRequest,
  getEmployee,
  getNowIso,
  getShift,
  getShiftFixBot,
  listCoveragePartsForRequest,
  listOffersForRequest,
  updateShift,
  upsertCoveragePart,
  upsertCoverageRequest,
  upsertOffer,
} from "@/lib/db/queries";
import { getState, newId, updateState } from "@/lib/db/store";
import type {
  CoveragePart,
  CoverageRequest,
  Intent,
  Message,
  Offer,
  SkipRecord,
} from "@/lib/types";

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

/** Fire-and-forget wrapper: calls writeMessage, falls back to plain text synchronously. */
async function postBotAi(
  facts: Parameters<typeof writeMessage>[0],
  channel: "group" | "dm",
  dmPeerId: string | null = null,
): Promise<Message> {
  const result = await writeMessage(facts);
  return postBot(result.text, channel, dmPeerId);
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

// ── Single-shift offer flow ──────────────────────────────────────────────────

async function sendNextOffer(
  request: CoverageRequest,
  alreadyTried: string[],
): Promise<void> {
  const shiftEmployeeId = getShift(request.shiftId)?.employeeId ?? "";
  const { ranked, skipped } = computeRanking(request.shiftId, [
    shiftEmployeeId,
    ...alreadyTried,
  ]);
  recordSkips(request.id, skipped);

  const next = ranked.find((c) => !alreadyTried.includes(c.employee.id));
  if (!next) {
    // No single candidate — try splitting
    await trySplitAndOffer(request, skipped);
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
  if (status === "open" || status === "planning") {
    status = transition(status, "start_offering");
  } else if (status === "offering") {
    status = transition(status, "next_candidate");
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

  const sent = await explainDecision({
    action: "offer_sent",
    candidateName: candidate.name,
    rank: offer.rank,
    windowLabel: windowLabel(shift.start, shift.end),
  });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "offer_sent",
    reason: sent.text,
    aiProvider: sent.provider,
    aiModelId: sent.modelId,
    aiLatencyMs: sent.latencyMs,
  });

  await postBotAi(
    {
      kind: "offer_dm",
      candidateName: candidate.name,
      callOutName: callOut.name,
      dayLabel: dayLabel(),
      windowLabel: windowLabel(shift.start, shift.end),
    },
    "dm",
    candidate.id,
  );
}

// ── Split flow ───────────────────────────────────────────────────────────────

async function trySplitAndOffer(
  request: CoverageRequest,
  wholeShiftSkips: SkipRecord[],
): Promise<void> {
  const shift = getShift(request.shiftId)!;
  const state = getState();

  const plans = computeSplitPlans({
    shift,
    employees: state.employees,
    availability: state.availability,
    allShifts: state.shifts,
    excludeEmployeeIds: [shift.employeeId],
  });

  if (plans.length === 0) {
    // Genuine escalation
    const action = request.status === "open" ? "no_candidates" : "exhausted";
    const normalizedFrom = request.status === "offering" ? "offering" : request.status === "planning" ? "planning" : "open";
    const status = transition(normalizedFrom, action);
    upsertCoverageRequest({ ...request, status, currentOfferId: null, updatedAt: getNowIso() });
    const skipReasons = wholeShiftSkips.map((s) => s.reason);
    const escalated = await explainDecision({ action: "escalated" });
    appendAudit({
      requestId: request.id,
      actor: "agent",
      action: "escalated",
      reason: escalated.text,
      aiProvider: escalated.provider,
      aiModelId: escalated.modelId,
      aiLatencyMs: escalated.latencyMs,
    });
    await postBotAi({ kind: "escalate", skipReasons }, "group", null);
    return;
  }

  const best = plans[0];
  const splitDesc = best.parts.map((p) => windowLabel(p.startsAt, p.endsAt)).join(", ");
  const splitChosen = await explainDecision({
    action: "split_plan_chosen",
    splitParts: `${best.parts.length} parts: ${splitDesc}`,
  });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "split_plan_chosen",
    reason: splitChosen.text,
    aiProvider: splitChosen.provider,
    aiModelId: splitChosen.modelId,
    aiLatencyMs: splitChosen.latencyMs,
  });

  // Transition to planning — start_planning is valid from open; from offering we set directly
  const updatedRequest: CoverageRequest = {
    ...request,
    status: "planning",
    currentOfferId: null,
    updatedAt: getNowIso(),
  };
  upsertCoverageRequest(updatedRequest);

  // Create coverage_parts
  const parts: CoveragePart[] = best.parts.map((p) => ({
    id: newId("part"),
    requestId: request.id,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    status: "open" as const,
    assignedEmployeeId: null,
  }));
  for (const part of parts) {
    upsertCoveragePart(part);
  }

  // Offer each part to its top candidate
  for (let i = 0; i < best.parts.length; i++) {
    const planPart = best.parts[i];
    const dbPart = parts[i];
    const topCandidate = planPart.candidates[0];

    const now = getNowIso();
    const offer: Offer = {
      id: newId("offer"),
      requestId: request.id,
      partId: dbPart.id,
      employeeId: topCandidate.employee.id,
      rank: i + 1,
      status: "pending",
      sentAt: now,
      answeredAt: null,
      expiresAt: new Date(Date.parse(now) + OFFER_TIMEOUT_MS).toISOString(),
      skipReason: null,
    };
    upsertOffer(offer);

    // Update part to offering
    upsertCoveragePart({ ...dbPart, status: "offering" });

    const callOut = getEmployee(shift.employeeId)!;
    const partWindow = windowLabel(dbPart.startsAt, dbPart.endsAt);
    const sent = await explainDecision({
      action: "offer_sent",
      candidateName: topCandidate.employee.name,
      rank: i + 1,
      windowLabel: partWindow,
    });
    appendAudit({
      requestId: request.id,
      actor: "agent",
      action: "split_offer_sent",
      reason: sent.text,
      aiProvider: sent.provider,
      aiModelId: sent.modelId,
      aiLatencyMs: sent.latencyMs,
    });

    await postBotAi(
      {
        kind: "offer_dm",
        candidateName: topCandidate.employee.name,
        callOutName: callOut.name,
        dayLabel: dayLabel(),
        windowLabel: partWindow,
      },
      "dm",
      topCandidate.employee.id,
    );
  }

  // Track the last offer sent as currentOfferId for the first uncovered part
  const firstOffer = listOffersForRequest(request.id).find(
    (o) => o.partId !== undefined && o.status === "pending",
  );
  if (firstOffer) {
    upsertCoverageRequest({
      ...updatedRequest,
      status: "offering",
      currentOfferId: firstOffer.id,
    });
  }
}

// ── Accept / Decline for split parts ────────────────────────────────────────

async function handlePartAccept(senderId: string, offer: Offer): Promise<void> {
  const request = getActiveCoverageRequest();
  if (!request) return;

  const parts = listCoveragePartsForRequest(request.id);
  const part = parts.find((p) => p.id === offer.partId);
  if (!part) return;

  const shift = getShift(request.shiftId)!;

  // Overlap check
  const state = getState();
  const hasOverlap = state.shifts.some(
    (s) =>
      s.employeeId === senderId &&
      s.id !== shift.id &&
      s.status !== "cancelled" &&
      new Date(s.start) < new Date(part.endsAt) &&
      new Date(part.startsAt) < new Date(s.end),
  );
  if (hasOverlap) {
    postBot("sorry, looks like that slot just got taken — checking someone else.", "dm", senderId);
    await replacePartOffer(request, offer, part);
    return;
  }

  upsertOffer({ ...offer, status: "accepted", answeredAt: getNowIso() });
  upsertCoveragePart({ ...part, status: "accepted", assignedEmployeeId: senderId });

  const employee = getEmployee(senderId)!;
  const partWin = windowLabel(part.startsAt, part.endsAt);
  const partExplain = await explainDecision({
    action: "part_accepted",
    candidateName: employee.name,
    windowLabel: partWin,
  });
  appendAudit({
    requestId: request.id,
    actor: "worker",
    action: "part_accepted",
    reason: partExplain.text,
    aiProvider: partExplain.provider,
    aiModelId: partExplain.modelId,
    aiLatencyMs: partExplain.latencyMs,
  });

  await postBotAi(
    { kind: "part_confirm_dm", dayLabel: dayLabel(), windowLabel: partWin },
    "dm",
    senderId,
  );

  // Check if all parts are now accepted/covered
  const allParts = listCoveragePartsForRequest(request.id);
  const updated = allParts.map((p) =>
    p.id === part.id
      ? { ...p, status: "accepted" as const, assignedEmployeeId: senderId }
      : p,
  );
  const allDone = updated.every((p) => p.status === "accepted" || p.status === "covered");

  if (allDone) {
    // Assign all accepted parts and flip the parent shift to covered (atomic in one updateState).
    updateState((s) => {
      const emp = s.employees.find((e) => e.id === senderId);
      if (emp) emp.lastPickupAt = getNowIso();
      const req = s.coverageRequests.find((r) => r.id === request.id);
      if (req) {
        req.status = "covered";
        req.updatedAt = getNowIso();
      }
      for (const p of updated) {
        const dbPart = s.coverageParts.find((x) => x.id === p.id);
        if (dbPart) {
          dbPart.status = "covered";
          if (p.assignedEmployeeId) dbPart.assignedEmployeeId = p.assignedEmployeeId;
        }
      }
      const dbShift = s.shifts.find((x) => x.id === shift.id);
      if (dbShift) {
        dbShift.status = "covered";
        // Keep a primary assignee for schedule display; UI also reads coverage_parts.
        const primary = updated.find((p) => p.assignedEmployeeId)?.assignedEmployeeId;
        if (primary) dbShift.employeeId = primary;
      }
    });

    // Build announcement from all parts
    const coverageDesc = updated
      .map((p) => `${getEmployee(p.assignedEmployeeId ?? senderId)?.name} (${windowLabel(p.startsAt, p.endsAt)})`)
      .join(", ");

    const shiftWin = windowLabel(shift.start, shift.end);
    const assigned = await explainDecision({
      action: "auto_assigned",
      splitParts: coverageDesc,
    });
    appendAudit({
      requestId: request.id,
      actor: "agent",
      action: "auto_assigned",
      reason: assigned.text,
      aiProvider: assigned.provider,
      aiModelId: assigned.modelId,
      aiLatencyMs: assigned.latencyMs,
    });

    await postBotAi(
      { kind: "split_announcement", dayLabel: dayLabel(), windowLabel: shiftWin, coverageDesc },
      "group",
    );

    const manager = getState().employees.find((e) => e.isManager);
    if (manager) {
      await postBotAi(
        { kind: "manager_dm", dayLabel: dayLabel(), windowLabel: shiftWin, coverageDesc },
        "dm",
        manager.id,
      );
    }
  }
}

async function replacePartOffer(
  request: CoverageRequest,
  oldOffer: Offer,
  part: CoveragePart,
): Promise<void> {
  const state = getState();
  const shift = getShift(request.shiftId)!;
  const previouslyOffered = listOffersForRequest(request.id)
    .filter((o) => o.partId === part.id)
    .map((o) => o.employeeId);

  // Find replacement candidate for this exact part
  const partShift = { ...shift, start: part.startsAt, end: part.endsAt, id: `replace_${part.id}` };
  const result = findEligibleCandidates({
    shift: partShift,
    employees: state.employees,
    availability: state.availability,
    allShifts: state.shifts,
    excludeEmployeeIds: [shift.employeeId, ...previouslyOffered],
  });
  const ranked = rankCandidates(result.eligible);

  if (ranked.length === 0) {
    // Can't replace this part — escalate
    upsertCoverageRequest({ ...request, status: "escalated", updatedAt: getNowIso() });
    const pWin = windowLabel(part.startsAt, part.endsAt);
    const escalated = await explainDecision({ action: "escalated" });
    appendAudit({
      requestId: request.id,
      actor: "agent",
      action: "escalated",
      reason: escalated.text,
      aiProvider: escalated.provider,
      aiModelId: escalated.modelId,
      aiLatencyMs: escalated.latencyMs,
    });
    await postBotAi(
      { kind: "escalate", skipReasons: [`No replacement found for the ${pWin} part`] },
      "group",
    );
    return;
  }

  const next = ranked[0];
  const now = getNowIso();
  const newOffer: Offer = {
    id: newId("offer"),
    requestId: request.id,
    partId: part.id,
    employeeId: next.employee.id,
    rank: listOffersForRequest(request.id).length + 1,
    status: "pending",
    sentAt: now,
    answeredAt: null,
    expiresAt: new Date(Date.parse(now) + OFFER_TIMEOUT_MS).toISOString(),
    skipReason: null,
  };
  upsertOffer(newOffer);
  upsertCoveragePart({ ...part, status: "offering" });

  const callOut = getEmployee(shift.employeeId)!;
  const rWin = windowLabel(part.startsAt, part.endsAt);
  const sent = await explainDecision({
    action: "offer_sent",
    candidateName: next.employee.name,
    rank: newOffer.rank,
    windowLabel: rWin,
  });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "split_offer_sent",
    reason: sent.text,
    aiProvider: sent.provider,
    aiModelId: sent.modelId,
    aiLatencyMs: sent.latencyMs,
  });

  await postBotAi(
    {
      kind: "offer_dm",
      candidateName: next.employee.name,
      callOutName: callOut.name,
      dayLabel: dayLabel(),
      windowLabel: rWin,
    },
    "dm",
    next.employee.id,
  );

  upsertCoverageRequest({ ...request, currentOfferId: newOffer.id, updatedAt: now });
}

// ── Call-out handler ─────────────────────────────────────────────────────────

async function handleCallOut(senderId: string, text: string, intent: Intent, confidence: number) {
  const shift = findAmandaMondayShift();
  if (!shift) {
    postBot("I couldn't find that shift on the schedule.", "group");
    return;
  }
  if (senderId !== shift.employeeId) {
    postBot(
      "for this demo, only the scheduled employee can post a call-out for their own shift.",
      "group",
    );
    return;
  }

  const existing = getActiveCoverageRequest();
  if (existing) {
    postBot("already working a coverage request — hang tight.", "group");
    return;
  }

  await postBotAi({ kind: "looking_reply" }, "group");

  const request = createCoverageRequest(shift.id, text);
  const interpreted = await explainDecision({
    action: "interpreted_call_out",
    intent,
    confidence,
  });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "interpreted_call_out",
    reason: interpreted.text,
    aiProvider: interpreted.provider,
    aiModelId: interpreted.modelId,
    aiLatencyMs: interpreted.latencyMs,
  });

  await sendNextOffer(request, []);
}

// ── Accept handler ───────────────────────────────────────────────────────────

async function handleAccept(senderId: string) {
  const request = getActiveCoverageRequest();
  if (!request) {
    postBot("no open offer for you right now.", "dm", senderId);
    return;
  }

  const offers = listOffersForRequest(request.id);

  // Check if this is a split-part offer
  const pendingPartOffer = offers.find(
    (o) => o.employeeId === senderId && o.status === "pending" && o.partId,
  );
  if (pendingPartOffer) {
    await handlePartAccept(senderId, pendingPartOffer);
    return;
  }

  // Single-shift offer flow
  const current = request.currentOfferId
    ? offers.find((o) => o.id === request.currentOfferId)
    : undefined;
  const dmThread = current?.employeeId ?? senderId;

  if (!current || request.status !== "offering") {
    postBot("no open offer for you right now.", "dm", dmThread);
    return;
  }

  if (current.employeeId !== senderId) {
    postBot(
      `that offer is for ${getEmployee(current.employeeId)?.name ?? "someone else"}.`,
      "dm",
      dmThread,
    );
    return;
  }

  // Auto-assign: verify no overlap
  const shift = getShift(request.shiftId)!;
  const state = getState();
  const hasOverlap = state.shifts.some(
    (s) =>
      s.employeeId === senderId &&
      s.id !== shift.id &&
      s.status !== "cancelled" &&
      new Date(s.start) < new Date(shift.end) &&
      new Date(shift.start) < new Date(s.end),
  );
  if (hasOverlap) {
    postBot("sorry, looks like that slot just got taken — checking someone else.", "dm", senderId);
    const tried = offers.map((o) => o.employeeId);
    await sendNextOffer({ ...request }, tried);
    return;
  }

  upsertOffer({ ...current, status: "accepted", answeredAt: getNowIso() });

  updateShift({ ...shift, employeeId: senderId, status: "covered" });

  updateState((s) => {
    const emp = s.employees.find((e) => e.id === senderId);
    if (emp) emp.lastPickupAt = getNowIso();
    const req = s.coverageRequests.find((r) => r.id === request.id);
    if (req) { req.status = "covered"; req.updatedAt = getNowIso(); }
  });

  const coverEmployee = getEmployee(senderId)!;

  const shiftWin = windowLabel(shift.start, shift.end);
  const accepted = await explainDecision({
    action: "offer_accepted",
    candidateName: coverEmployee.name,
    windowLabel: shiftWin,
  });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "offer_accepted",
    reason: accepted.text,
    aiProvider: accepted.provider,
    aiModelId: accepted.modelId,
    aiLatencyMs: accepted.latencyMs,
  });
  const assigned = await explainDecision({
    action: "auto_assigned",
    candidateName: coverEmployee.name,
    windowLabel: shiftWin,
  });
  appendAudit({
    requestId: request.id,
    actor: "agent",
    action: "auto_assigned",
    reason: assigned.text,
    aiProvider: assigned.provider,
    aiModelId: assigned.modelId,
    aiLatencyMs: assigned.latencyMs,
  });

  await postBotAi(
    { kind: "confirm_dm", dayLabel: dayLabel(), windowLabel: shiftWin },
    "dm",
    senderId,
  );
  await postBotAi(
    {
      kind: "group_announcement",
      dayLabel: dayLabel(),
      windowLabel: shiftWin,
      candidateName: coverEmployee.name,
    },
    "group",
  );

  const manager = getState().employees.find((e) => e.isManager);
  if (manager) {
    await postBotAi(
      {
        kind: "manager_dm",
        dayLabel: dayLabel(),
        windowLabel: shiftWin,
        coverageDesc: coverEmployee.name,
      },
      "dm",
      manager.id,
    );
  }
}

// ── Decline handler ──────────────────────────────────────────────────────────

async function handleDecline(senderId: string) {
  const request = getActiveCoverageRequest();
  if (!request) return;

  const offers = listOffersForRequest(request.id);

  // Check for split-part offer
  const pendingPartOffer = offers.find(
    (o) => o.employeeId === senderId && o.status === "pending" && o.partId,
  );
  if (pendingPartOffer) {
    upsertOffer({ ...pendingPartOffer, status: "declined", answeredAt: getNowIso() });
    const part = listCoveragePartsForRequest(request.id).find((p) => p.id === pendingPartOffer.partId);
    if (!part) return;
    const employee = getEmployee(senderId)!;
    const pWin = windowLabel(part.startsAt, part.endsAt);
    const declined = await explainDecision({
      action: "part_declined",
      candidateName: employee.name,
      windowLabel: pWin,
    });
    appendAudit({
      requestId: request.id,
      actor: "worker",
      action: "part_declined",
      reason: declined.text,
      aiProvider: declined.provider,
      aiModelId: declined.modelId,
      aiLatencyMs: declined.latencyMs,
    });
    await postBotAi({ kind: "decline_next" }, "dm", senderId);
    await replacePartOffer(request, pendingPartOffer, part);
    return;
  }

  // Single-shift decline
  if (request.status !== "offering" || !request.currentOfferId) return;
  const current = offers.find((o) => o.id === request.currentOfferId);
  if (!current || current.employeeId !== senderId) return;

  upsertOffer({ ...current, status: "declined", answeredAt: getNowIso() });
  const declined = await explainDecision({
    action: "offer_declined",
    candidateName: getEmployee(senderId)?.name ?? senderId,
  });
  appendAudit({
    requestId: request.id,
    actor: "worker",
    action: "offer_declined",
    reason: declined.text,
    aiProvider: declined.provider,
    aiModelId: declined.modelId,
    aiLatencyMs: declined.latencyMs,
  });
  await postBotAi({ kind: "decline_next" }, "dm", senderId);

  const tried = offers
    .filter((o) => ["declined", "timed_out", "accepted"].includes(o.status) || o.id === current.id)
    .map((o) => o.employeeId);
  await sendNextOffer({ ...request, status: "offering" }, tried);
}

// ── Timeout handler ──────────────────────────────────────────────────────────

export async function processTimeouts(): Promise<{ timedOut: number }> {
  const now = Date.parse(getNowIso());
  const request = getActiveCoverageRequest();
  if (!request || request.status !== "offering") {
    return { timedOut: 0 };
  }

  // Split-safe: expire every pending offer past expiresAt (not only currentOfferId).
  const expired = listOffersForRequest(request.id).filter(
    (o) => o.status === "pending" && Date.parse(o.expiresAt) <= now,
  );
  if (expired.length === 0) return { timedOut: 0 };

  let timedOut = 0;
  for (const offer of expired) {
    // Re-read request — replacePartOffer / sendNextOffer may escalate or cover.
    const active = getActiveCoverageRequest();
    if (!active || active.id !== request.id || active.status !== "offering") break;

    const stillPending = listOffersForRequest(request.id).find(
      (o) => o.id === offer.id && o.status === "pending",
    );
    if (!stillPending) continue;

    upsertOffer({ ...stillPending, status: "timed_out", answeredAt: getNowIso() });
    appendAudit({
      requestId: request.id,
      actor: "agent",
      action: "offer_timed_out",
      reason: `${getEmployee(stillPending.employeeId)?.name} did not reply in time`,
    });
    postBot("timed out — moving on.", "dm", stillPending.employeeId);
    timedOut += 1;

    if (stillPending.partId) {
      const part = listCoveragePartsForRequest(request.id).find(
        (p) => p.id === stillPending.partId,
      );
      if (part) {
        await replacePartOffer(active, stillPending, part);
      }
    } else {
      const tried = listOffersForRequest(request.id).map((o) => o.employeeId);
      await sendNextOffer(
        { ...getActiveCoverageRequest()!, status: "offering" },
        tried,
      );
    }
  }
  return { timedOut };
}

// ── Main message handler ─────────────────────────────────────────────────────

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

  // Build structured context for Granite
  const hasOpenOffer = (() => {
    const req = getActiveCoverageRequest();
    if (!req) return false;
    return listOffersForRequest(req.id).some((o) => o.employeeId === sender.id && o.status === "pending");
  })();

  const interpretCtx: InterpretContext = {
    senderName: sender.name,
    senderRole: sender.roles.join(", "),
    channel,
    hasOpenOffer,
    upcomingShifts: getState()
      .shifts.filter((s) => s.employeeId === sender.id && s.status !== "cancelled")
      .map((s) => `${formatShiftWindow(s.start, s.end)} ${s.role}`)
      .join("; "),
  };

  try {
    const interpretation = await interpretMessage({
      message: input.text,
      context: interpretCtx,
    });

    updateState((s) => {
      const m = s.messages.find((x) => x.id === userMsg.id);
      if (m) {
        m.graniteIntent = interpretation.intent;
        m.confidence = interpretation.confidence;
        m.aiProvider = interpretation.provider;
        m.aiModelId = interpretation.modelId;
        m.aiLatencyMs = interpretation.latencyMs;
      }
    });

    if (needsClarification(interpretation)) {
      await postBotAi({ kind: "clarify" }, channel, dmPeerId);
      return { messages: getState().messages.filter((m) => m.createdAt >= userMsg.createdAt) };
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
      case "partial_availability":
        // Worker can only do part of the shift — treat as decline for now and ask them to specify
        await postBotAi({ kind: "clarify" }, channel, dmPeerId);
        break;
      case "question":
        postBot(
          "I can help cover a call-out. Try: \"I'm not available for my Monday morning shift\".",
          channel,
          dmPeerId,
        );
        break;
      default: {
        // Small talk → brief ack or silence. Clarify only when shift-related but unclear.
        const raw = input.text.toLowerCase().trim().replace(/[!.,]+$/g, "");
        const isThanks =
          /^(thanks|thank you|thank u|thanks guys|thank u guys|thx|ty)$/i.test(raw);
        const isSmallTalk =
          isThanks ||
          /^(ok|okay|k|lol|lmao|haha|cool|great|awesome|np|no problem|anytime|cheers)$/i.test(
            raw,
          );
        if (isSmallTalk) {
          if (isThanks) postBot("anytime", channel, dmPeerId);
          break;
        }
        await postBotAi({ kind: "clarify" }, channel, dmPeerId);
        break;
      }
    }

    return { messages: getState().messages.filter((m) => m.createdAt >= userMsg.createdAt) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown agent error";
    postBot(`something went wrong: ${message}`, channel, dmPeerId);
    return { messages: [], error: message };
  }
}
