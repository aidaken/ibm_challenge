import { beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "@/lib/agent/handleMessage";
import { IDS } from "@/lib/db/seed";
import { getState, resetState } from "@/lib/db/store";

describe("small talk handling", () => {
  beforeEach(() => {
    resetState();
  });

  it("replies anytime to thanks without clarifying", async () => {
    const before = getState().messages.length;
    await handleMessage({
      senderId: IDS.amanda,
      channel: "group",
      text: "thank u guys",
    });
    const added = getState().messages.slice(before);
    const botId = getState().employees.find((e) => e.isBot)?.id;
    const botMsgs = added.filter((m) => m.senderId === botId);
    expect(botMsgs.some((m) => /anytime/i.test(m.text))).toBe(true);
    expect(botMsgs.some((m) => /call.?out|accepting|clarif/i.test(m.text))).toBe(
      false,
    );
  });

  it("stays silent for lol / ok", async () => {
    const before = getState().messages.length;
    await handleMessage({
      senderId: IDS.amanda,
      channel: "group",
      text: "lol",
    });
    await handleMessage({
      senderId: IDS.amanda,
      channel: "group",
      text: "ok",
    });
    const added = getState().messages.slice(before);
    const botId = getState().employees.find((e) => e.isBot)?.id;
    const botMsgs = added.filter((m) => m.senderId === botId);
    expect(botMsgs).toHaveLength(0);
  });
});
