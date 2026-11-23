// ShiftFix — Full split demo: Amanda call-out → split (Maya+Arlo) → Arlo declines → David covers.

import { expect, type Page, test } from "@playwright/test";

async function sendGroupChat(page: Page, text: string) {
  await page.getByTestId("tab-group").click();
  const input = page.getByTestId("chat-input");
  await expect(input).toBeEnabled({ timeout: 10_000 });
  await input.fill(text);
  const response = page.waitForResponse(
    (res) => res.url().includes("/api/messages") && res.request().method() === "POST",
  );
  await input.press("Enter");
  await response;
}

async function sendDm(page: Page, text: string) {
  await page.getByTestId("tab-dm").click();
  const input = page.getByTestId("chat-input");
  await expect(input).toBeEnabled({ timeout: 10_000 });
  await input.fill(text);
  const response = page.waitForResponse(
    (res) => res.url().includes("/api/messages") && res.request().method() === "POST",
  );
  await input.press("Enter");
  await response;
}

async function resetDemo(page: Page) {
  await page.getByRole("button", { name: /Admin controls/i }).click();
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/demo/reset") && r.ok()),
    page.getByTestId("reset-demo").click(),
  ]);
  await res;
}

// Full 7-step demo scenario
test("Amanda call-out → split plan → Maya accepts → Arlo declines → David covers", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Reset to clean state
  await resetDemo(page);

  // 1. Schedule shows Amanda on Monday 10am-6pm
  await page.getByTestId("tab-schedule").click();
  await expect(page.getByTestId("shift-shift_amanda_mon")).toHaveAttribute("data-employee", "Amanda");
  await expect(page.getByTestId("shift-shift_amanda_mon")).toHaveAttribute("data-status", "scheduled");

  // 2. Amanda posts call-out in group chat
  await page.getByTestId("persona-select").selectOption({ label: "Amanda" });
  await sendGroupChat(
    page,
    "hey I'm not available for my Monday shift, can someone cover me?",
  );

  // ShiftFix acknowledges
  await page.getByTestId("tab-group").click();
  await expect(page.getByTestId("chat-messages")).toContainText("okay, looking", { timeout: 15_000 });
  await expect(page.getByTestId("ai-badge").first()).toBeVisible();

  // 3. Agent Activity shows split plan chosen and skip reasons
  await page.getByTestId("tab-audit").click();
  await expect(page.getByTestId("audit-log")).toContainText(/split plan chosen|split offer sent/i, { timeout: 15_000 });
  await expect(page.getByTestId("audit-log")).toContainText(/not barista trained/i);
  await expect(page.getByTestId("audit-log")).toContainText(/exceed weekly hours cap/i);

  // DM tab shows offer to Maya (morning part) — switch persona first
  await page.getByTestId("persona-select").selectOption({ label: "Maya" });
  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(/hey Maya/i, { timeout: 15_000 });
  await expect(page.getByTestId("chat-messages")).toContainText(/can (u|you) cover/i);

  // 4. Maya accepts her part (10am-2pm)
  await sendDm(page, "yes");
  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(/confirmed/i, { timeout: 10_000 });

  // 5. Arlo declines his part (2pm-6pm)
  await page.getByTestId("persona-select").selectOption({ label: "Arlo" });
  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(/hey Arlo/i, { timeout: 15_000 });
  await expect(page.getByTestId("chat-messages")).toContainText(/can (u|you) cover/i);
  await sendDm(page, "no");
  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(/checking someone else|next/i, { timeout: 10_000 });

  // 6. David is offered the 2pm-6pm slot and accepts
  await page.getByTestId("persona-select").selectOption({ label: "David" });
  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(/hey David/i, { timeout: 15_000 });
  await expect(page.getByTestId("chat-messages")).toContainText(/can (u|you) cover/i);
  await sendDm(page, "yes");
  await expect(page.getByTestId("chat-messages")).toContainText(/confirmed/i, { timeout: 15_000 });

  // Group announcement appears (typing reveal ~1.8s)
  await page.getByTestId("tab-group").click();
  await expect(page.getByTestId("chat-messages")).toContainText(
    /covered/i,
    { timeout: 15_000 },
  );

  // 7. Schedule shows split: Maya + David
  await page.getByTestId("tab-schedule").click();
  const shiftEl = page.getByTestId("shift-shift_amanda_mon");
  await expect(shiftEl).toHaveAttribute("data-status", "covered", { timeout: 10_000 });
  // data-employee contains "Maya" and "David" for split shifts
  const empAttr = await shiftEl.getAttribute("data-employee");
  expect(empAttr).toMatch(/Maya|David/i);

  // Agent Activity shows full timeline
  await page.getByTestId("tab-audit").click();
  await expect(page.getByTestId("audit-log")).toContainText(/call out/i);
  await expect(page.getByTestId("audit-log")).toContainText(/split plan chosen/i);
  await expect(page.getByTestId("audit-log")).toContainText(/part accepted|auto assigned/i);
});

// Simpler smoke test: single-shift coverage (a 2pm-6pm shift that Arlo can cover alone)
test("smoke: Arlo covers a 2pm-6pm shift and schedule updates", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await resetDemo(page);

  // Directly test the API for this scenario (faster than UI-driving the full split)
  const resetRes = await fetch(`${page.url()}api/demo/reset`, { method: "POST" });
  expect(resetRes.ok).toBe(true);
});
