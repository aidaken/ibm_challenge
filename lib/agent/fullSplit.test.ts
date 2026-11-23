import { beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "@/lib/agent/handleMessage";
import { IDS } from "@/lib/db/seed";
import { getState, resetState } from "@/lib/db/store";

describe("full split path", () => {
  beforeEach(() => {
    resetState();
  });

  it("maya yes → arlo no → david yes → covered", async () => {
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
    await handleMessage({
      senderId: IDS.arlo,
      channel: "dm",
      dmPeerId: IDS.arlo,
      text: "no",
    });
    const pending = getState().offers.find((o) => o.status === "pending");
    expect(pending?.employeeId).toBe(IDS.david);

    await handleMessage({
      senderId: IDS.david,
      channel: "dm",
      dmPeerId: IDS.david,
      text: "yes",
    });

    const state = getState();
    expect(state.shifts.find((s) => s.id === IDS.shiftAmandaMon)?.status).toBe(
      "covered",
    );
    expect(
      state.messages.some((m) => m.channel === "group" && /covered/i.test(m.text)),
    ).toBe(true);
  });
});
