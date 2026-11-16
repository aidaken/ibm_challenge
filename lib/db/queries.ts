// ShiftFix — written by IBM Bob
// Query helpers over the demo store (swap to Supabase later via same shapes).

import type {
  AuditEvent,
  CoverageRequest,
  Employee,
  Message,
  Offer,
  Shift,
} from "@/lib/types";
import { getState, newId, updateState } from "@/lib/db/store";
import { IDS } from "@/lib/db/seed";

export function listEmployees(): Employee[] {
  return getState().employees;
}

export function getEmployee(id: string): Employee | undefined {
  return getState().employees.find((e) => e.id === id);
}

export function getShiftFixBot(): Employee {
  const bot = getEmployee(IDS.shiftfix);
  if (!bot) throw new Error("ShiftFix bot missing from seed");
  return bot;
}

export function listShifts(): Shift[] {
  return getState().shifts;
}

export function getShift(id: string): Shift | undefined {
  return getState().shifts.find((s) => s.id === id);
}

export function listMessages(channel: "group" | "dm", dmPeerId?: string): Message[] {
  return getState()
    .messages.filter((m) => {
      if (m.channel !== channel) return false;
      if (channel === "dm") return m.dmPeerId === dmPeerId;
      return true;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listAuditEvents(): AuditEvent[] {
  return [...getState().auditEvents].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
}

export function getActiveCoverageRequest(): CoverageRequest | undefined {
  return getState().coverageRequests.find((r) =>
    ["open", "offering", "pending_approval"].includes(r.status),
  );
}

export function getCoverageRequest(id: string): CoverageRequest | undefined {
  return getState().coverageRequests.find((r) => r.id === id);
}

export function listOffersForRequest(requestId: string): Offer[] {
  return getState()
    .offers.filter((o) => o.requestId === requestId)
    .sort((a, b) => a.rank - b.rank);
}

export function appendMessage(
  partial: Omit<Message, "id" | "createdAt"> & { createdAt?: string },
): Message {
  const msg: Message = {
    ...partial,
    id: newId("msg"),
    createdAt: partial.createdAt ?? getState().nowIso,
  };
  updateState((s) => {
    s.messages.push(msg);
  });
  return msg;
}

export function appendAudit(
  partial: Omit<AuditEvent, "id" | "timestamp"> & { timestamp?: string },
): AuditEvent {
  const event: AuditEvent = {
    ...partial,
    id: newId("audit"),
    timestamp: partial.timestamp ?? getState().nowIso,
  };
  updateState((s) => {
    s.auditEvents.push(event);
  });
  return event;
}

export function upsertCoverageRequest(request: CoverageRequest): void {
  updateState((s) => {
    const idx = s.coverageRequests.findIndex((r) => r.id === request.id);
    if (idx >= 0) s.coverageRequests[idx] = request;
    else s.coverageRequests.push(request);
  });
}

export function upsertOffer(offer: Offer): void {
  updateState((s) => {
    const idx = s.offers.findIndex((o) => o.id === offer.id);
    if (idx >= 0) s.offers[idx] = offer;
    else s.offers.push(offer);
  });
}

export function updateShift(shift: Shift): void {
  updateState((s) => {
    const idx = s.shifts.findIndex((x) => x.id === shift.id);
    if (idx >= 0) s.shifts[idx] = shift;
  });
}

export function bumpNow(ms: number): string {
  let next = "";
  updateState((s) => {
    next = new Date(Date.parse(s.nowIso) + ms).toISOString();
    s.nowIso = next;
  });
  return next;
}

export function getNowIso(): string {
  return getState().nowIso;
}
