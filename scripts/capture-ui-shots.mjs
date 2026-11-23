import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const out = "docs/screenshots";
mkdirSync(out, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}

const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

async function prep(page) {
  await page.goto("http://127.0.0.1:3000");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Admin controls/i }).click();
  const resetBtn = page.getByTestId("reset-demo");
  await resetBtn.waitFor({ state: "visible", timeout: 10_000 });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/demo/reset") && r.ok(), {
      timeout: 30_000,
    }),
    resetBtn.click(),
  ]);
  await page.waitForTimeout(500);
}

async function activate(page, id) {
  await page.getByTestId(id).first().evaluate((el) => el.click());
}

{
  const page = await desktop.newPage();
  await prep(page);
  await activate(page, "rail-chats");
  await page.waitForTimeout(400);
  await shot(page, "desktop-chat-list");
  await activate(page, "tab-group");
  await page.waitForTimeout(400);
  await shot(page, "desktop-team-chat");
  await page.getByTestId("persona-select").selectOption({ label: "Amanda" });
  await activate(page, "tab-group");
  const input = page.getByTestId("chat-input");
  await input.fill("hey I'm not available for my Monday shift, can someone cover me?");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/messages") && r.request().method() === "POST"),
    input.press("Enter"),
  ]);
  await page.waitForTimeout(2500);
  await page.getByTestId("persona-select").selectOption({ label: "Maya" });
  await activate(page, "tab-dm");
  await page.waitForTimeout(800);
  await shot(page, "desktop-dm-offer");
  await activate(page, "rail-schedule");
  await page.waitForTimeout(400);
  await shot(page, "desktop-schedule");
  await activate(page, "rail-audit");
  await page.waitForTimeout(400);
  await shot(page, "desktop-activity");
  await page.close();
}

{
  const page = await phone.newPage();
  await prep(page);
  await activate(page, "bottom-tab-chats");
  await page.waitForTimeout(400);
  await shot(page, "phone-chat-list");
  await activate(page, "tab-group");
  await page.waitForTimeout(400);
  await shot(page, "phone-team-chat");
  await page.getByTestId("persona-select").selectOption({ label: "Amanda" });
  await activate(page, "tab-group");
  const input = page.getByTestId("chat-input");
  await input.fill("hey I'm not available for my Monday shift, can someone cover me?");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/messages") && r.request().method() === "POST"),
    input.press("Enter"),
  ]);
  await page.waitForTimeout(2500);
  await page.getByTestId("persona-select").selectOption({ label: "Maya" });
  await activate(page, "tab-dm");
  await page.waitForTimeout(800);
  await shot(page, "phone-dm-offer");
  // Leave conversation so bottom tabs are visible (or use e2e hooks).
  await activate(page, "tab-schedule");
  await page.waitForTimeout(400);
  await shot(page, "phone-schedule");
  await activate(page, "tab-audit");
  await page.waitForTimeout(400);
  await shot(page, "phone-activity");
  await page.close();
}

await browser.close();
console.log("screenshots written to", out);
