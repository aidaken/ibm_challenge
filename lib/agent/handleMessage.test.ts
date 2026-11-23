import { beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "@/lib/agent/handleMessage";
import { IDS } from "@/lib/db/seed";
import { resetState, getState } from "@/lib/db/store";

describe("handleMessage demo flow", () => {
  beforeEach(() => {
    resetState();
  });

  it("splits shift into parts when no single candidate can cover the full shift", async () => {
    // With the new seed, nobody can cover Amanda's full 10am-6pm shift alone.
    // The agent should find a split: Maya (10am-2pm) + Arlo or David (2pm-6pm).
    await handleMessage({
      senderId: IDS.amanda,
      channel: "group",
      text: "hey I'm not available for my Monday morning shift, can someone cover me?",
    });

    const state = getState();
    expect(state.messages.some((m) => m.text === "okay, looking")).toBe(true);
    // Jordan skipped (not barista), Chris skipped (hours cap)
    expect(state.auditEvents.some((e) => /not barista trained/i.test(e.reason))).toBe(true);
    expect(state.auditEvents.some((e) => /exceed weekly hours cap/i.test(e.reason))).toBe(true);

    // Split plan chosen
    expect(
      state.auditEvents.some((e) => e.action === "split_plan_chosen"),
    ).toBe(true);

    // Coverage parts created
    expect(state.coverageParts.length).toBeGreaterThanOrEqual(2);

    // DMs sent to part candidates (Maya for 10am-2pm, Arlo or David for 2pm-6pm)
    const dmMessages = state.messages.filter((m) => m.channel === "dm");
    expect(dmMessages.length).toBeGreaterThanOrEqual(2);

    // Maya should get an offer for the morning part
    const mayaDm = dmMessages.find((m) => m.dmPeerId === IDS.maya);
    expect(mayaDm).toBeTruthy();
  });

  it("covers a 2pm-6pm part shift with Arlo after accept", async () => {
    // Directly test the offer/accept cycle with a partial shift that Arlo can cover
    const { getShift, updateShift, upsertCoverageRequest, upsertOffer, getNowIso } = await import("@/lib/db/queries");
    const { updateState, newId } = await import("@/lib/db/store");

    // Set the shift to 2pm-6pm so Arlo is eligible
    const shift = getShift(IDS.shiftAmandaMon)!;
    updateShift({
      ...shift,
      start: "2026-11-16T14:00:00.000Z",
      end: "2026-11-16T18:00:00.000Z",
      status: "needs_cover",
    });

    const now = getNowIso();
    const req = {
      id: newId("req"),
      shiftId: IDS.shiftAmandaMon,
      reason: "test",
      status: "offering" as const,
      currentOfferId: null,
      createdAt: now,
      updatedAt: now,
    };
    upsertCoverageRequest(req);

    const offer = {
      id: newId("offer"),
      requestId: req.id,
      employeeId: IDS.arlo,
      rank: 1,
      status: "pending" as const,
      sentAt: now,
      answeredAt: null,
      expiresAt: new Date(Date.parse(now) + 10 * 60 * 1000).toISOString(),
      skipReason: null,
    };
    upsertOffer(offer);
    updateState((s) => {
      const r = s.coverageRequests.find((x) => x.id === req.id);
      if (r) r.currentOfferId = offer.id;
    });

    // Arlo accepts
    await handleMessage({
      senderId: IDS.arlo,
      channel: "dm",
      dmPeerId: IDS.arlo,
      text: "yes",
    });

    const state = getState();
    const updatedShift = state.shifts.find((s) => s.id === IDS.shiftAmandaMon)!;
    expect(updatedShift.employeeId).toBe(IDS.arlo);
    expect(updatedShift.status).toBe("covered");
    expect(state.messages.some((m) => m.channel === "group" && /covered/i.test(m.text))).toBe(true);
    expect(state.messages.some((m) => m.channel === "dm" && m.dmPeerId === IDS.arlo && /confirmed/i.test(m.text))).toBe(true);
    expect(state.auditEvents.some((e) => e.action === "offer_accepted")).toBe(true);
    expect(state.auditEvents.some((e) => e.action === "auto_assigned")).toBe(true);
  });

  it("declines offer and escalates when no next candidate", async () => {
    // Set shift to 2pm-6pm so Arlo is eligible, then he declines
    const { getShift, updateShift, upsertCoverageRequest, upsertOffer, getNowIso } = await import("@/lib/db/queries");
    const { updateState, newId } = await import("@/lib/db/store");

    const shift = getShift(IDS.shiftAmandaMon)!;
    updateShift({
      ...shift,
      start: "2026-11-16T14:00:00.000Z",
      end: "2026-11-16T18:00:00.000Z",
      status: "needs_cover",
    });

    const now = getNowIso();
    const req = {
      id: newId("req"),
      shiftId: IDS.shiftAmandaMon,
      reason: "test",
      status: "offering" as const,
      currentOfferId: null,
      createdAt: now,
      updatedAt: now,
    };
    upsertCoverageRequest(req);

    const offer = {
      id: newId("offer"),
      requestId: req.id,
      employeeId: IDS.arlo,
      rank: 1,
      status: "pending" as const,
      sentAt: now,
      answeredAt: null,
      expiresAt: new Date(Date.parse(now) + 10 * 60 * 1000).toISOString(),
      skipReason: null,
    };
    upsertOffer(offer);
    updateState((s) => {
      const r = s.coverageRequests.find((x) => x.id === req.id);
      if (r) r.currentOfferId = offer.id;
    });

    await handleMessage({
      senderId: IDS.arlo,
      channel: "dm",
      dmPeerId: IDS.arlo,
      text: "no",
    });

    const state = getState();
    const declinedOffer = state.offers.find((o) => o.status === "declined");
    expect(declinedOffer).toBeTruthy();
    expect(declinedOffer?.employeeId).toBe(IDS.arlo);
    // David is next for 2pm-6pm: a new pending offer should be created for David
    const davidOffer = state.offers.find((o) => o.employeeId === IDS.david && o.status === "pending");
    expect(davidOffer).toBeTruthy();
  });
});
