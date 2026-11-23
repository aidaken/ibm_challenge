import { beforeEach, describe, expect, it } from "vitest";
import { handleMessage, processTimeouts } from "@/lib/agent/handleMessage";
import { bumpNow } from "@/lib/db/queries";
import { IDS } from "@/lib/db/seed";
import { getState, resetState } from "@/lib/db/store";

describe("processTimeouts (split-safe)", () => {
  beforeEach(() => {
    resetState();
  });

  it("times out Arlo's pending part after Maya accepts and clock advances", async () => {
    await handleMessage({
      senderId: IDS.amanda,
      channel: "group",
      text: "hey I'm not available for my Monday shift, can someone cover me?",
    });
    await handleMessage({
      senderId: IDS.maya,
      channel: "dm",
      dmPeerId: IDS.maya,
      text: "yes",
    });

    const arloPending = getState().offers.find(
      (o) => o.employeeId === IDS.arlo && o.status === "pending",
    );
    expect(arloPending).toBeTruthy();

    bumpNow(11 * 60 * 1000);
    const result = await processTimeouts();
    expect(result.timedOut).toBeGreaterThanOrEqual(1);

    const state = getState();
    expect(
      state.offers.some(
        (o) => o.employeeId === IDS.arlo && o.status === "timed_out",
      ),
    ).toBe(true);
    expect(
      state.auditEvents.some((e) => e.action === "offer_timed_out"),
    ).toBe(true);
    expect(
      state.offers.some((o) => o.employeeId === IDS.david && o.status === "pending"),
    ).toBe(true);
  });
});
