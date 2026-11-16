// ShiftFix — written by IBM Bob

import { beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "@/lib/agent/handleMessage";
import { IDS } from "@/lib/db/seed";
import { resetState, getState } from "@/lib/db/store";

describe("handleMessage demo flow", () => {
  beforeEach(() => {
    resetState();
  });

  it("covers Amanda's shift with Arlo after manager confirms", async () => {
    await handleMessage({
      senderId: IDS.amanda,
      channel: "group",
      text: "hey I'm not available for my Monday morning shift, can someone cover me?",
    });

    let state = getState();
    expect(state.messages.some((m) => m.text === "okay, looking")).toBe(true);
    expect(
      state.auditEvents.some((e) => /already working 9am-3pm/i.test(e.reason)),
    ).toBe(true);
    expect(state.messages.some((m) => m.channel === "dm" && m.dmPeerId === IDS.arlo)).toBe(
      true,
    );

    await handleMessage({
      senderId: IDS.arlo,
      channel: "dm",
      dmPeerId: IDS.arlo,
      text: "yes",
    });

    state = getState();
    expect(
      state.messages.some((m) => /awesome, checking with the manager/i.test(m.text)),
    ).toBe(true);
    expect(
      state.messages.some((m) =>
        /@manager, Arlo confirmed he can cover Amanda/i.test(m.text),
      ),
    ).toBe(true);

    await handleMessage({
      senderId: IDS.manager,
      channel: "group",
      text: "confirm",
    });

    state = getState();
    const shift = state.shifts.find((s) => s.id === IDS.shiftAmandaMon)!;
    expect(shift.employeeId).toBe(IDS.arlo);
    expect(shift.status).toBe("covered");
    expect(state.messages.some((m) => m.text === "you're confirmed")).toBe(true);
    expect(state.auditEvents.some((e) => e.action === "approved")).toBe(true);
  });
});
