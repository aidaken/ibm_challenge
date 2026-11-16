// ShiftFix — written by IBM Bob
// Exact hackathon demo: Amanda call-out → Arlo yes → manager confirm.

import { expect, type Page, test } from "@playwright/test";

async function sendChat(page: Page, text: string) {
  const input = page.getByTestId("chat-input");
  await expect(input).toBeEnabled();
  await input.fill(text);
  const response = page.waitForResponse(
    (res) => res.url().includes("/api/messages") && res.request().method() === "POST",
  );
  await input.press("Enter");
  await response;
}

test("Amanda call-out is covered by Arlo after manager confirms", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await page.getByTestId("reset-demo").click();
  await expect(page.getByTestId("shift-shift_amanda_mon")).toHaveAttribute(
    "data-employee",
    "Amanda",
  );

  await page.getByTestId("tab-group").click();
  await page.getByTestId("persona-select").selectOption({ label: "Amanda" });
  await sendChat(
    page,
    "hey I'm not available for my Monday morning shift, can someone cover me?",
  );

  await expect(page.getByTestId("chat-messages")).toContainText("okay, looking");
  await expect(page.getByTestId("ai-badge").first()).toBeVisible();

  await page.getByTestId("tab-audit").click();
  await expect(page.getByTestId("audit-log")).toContainText(/already working 9am-3pm/i);
  await expect(page.getByTestId("audit-log")).toContainText(/not barista trained/i);
  await expect(page.getByTestId("audit-log")).toContainText(/Offered to Arlo/i);

  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(
    /hey Arlo, since Amanda is out, can u cover her on Monday 11am to 5pm/i,
  );

  await page.getByTestId("persona-select").selectOption({ label: "Arlo" });
  await sendChat(page, "yes");
  await expect(page.getByTestId("chat-messages")).toContainText(
    /awesome, checking with the manager/i,
  );

  await page.getByTestId("tab-group").click();
  await expect(page.getByTestId("chat-messages")).toContainText(
    /@manager, Arlo confirmed he can cover Amanda on Monday/i,
  );

  await page.getByTestId("persona-select").selectOption({ label: "Manager" });
  await sendChat(page, "confirm");

  await page.getByTestId("tab-dm").click();
  await expect(page.getByTestId("chat-messages")).toContainText(/you're confirmed/i);

  await page.getByTestId("tab-schedule").click();
  await expect(page.getByTestId("shift-shift_amanda_mon")).toHaveAttribute(
    "data-employee",
    "Arlo",
  );
  await expect(page.getByTestId("shift-shift_amanda_mon")).toHaveAttribute(
    "data-status",
    "covered",
  );

  await page.getByTestId("tab-audit").click();
  await expect(page.getByTestId("audit-log")).toContainText("call_out");
  await expect(page.getByTestId("audit-log")).toContainText("offer_accepted");
  await expect(page.getByTestId("audit-log")).toContainText("approved");
});
