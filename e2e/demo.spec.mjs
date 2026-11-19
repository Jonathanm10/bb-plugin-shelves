import { mkdirSync } from "node:fs";
import { expect } from "@playwright/test";
import { test, fixture, reset, rpc, open, link, shelf, expand } from "./helpers.mjs";

test.use({ video: { mode: "on", size: { width: 1100, height: 800 } } });

// Capture real interactions against disposable BB data, with no mocked browser responses.
test("README demo settles, restores, snoozes, wakes, and searches a thread", async ({ page, request }) => {
  await reset(request);
  const first = fixture.threads[0];
  await rpc(request, "settle", { threadId: fixture.threads[3].id });
  await open(page, { core: true, theme: "dark" });
  const sidebar = page.locator("[data-bb-sidebar-root]");
  mkdirSync("e2e-artifacts/demo", { recursive: true });
  async function frame(number, screenshot) {
    await page.mouse.move(1000, 750);
    await sidebar.screenshot({ path: `e2e-artifacts/demo/${number}.png`, animations: "disabled" });
    if (screenshot) await sidebar.screenshot({ path: `docs/screenshots/${screenshot}.png`, animations: "disabled" });
    // Hold each demonstrated state long enough to read in the recording.
    await page.waitForTimeout(900);
  }

  let row = link(page, first.title).locator("xpath=..");
  await row.getByRole("button", { name: "Settle thread" }).focus();
  await frame("01");
  await row.getByRole("button", { name: "Settle thread" }).press("Enter");
  await expect(link(page, first.title)).toHaveCount(0);
  await expand(page, "Settled");
  const settled = shelf(page, "Settled").getByRole("link", { name: new RegExp(`${first.title}$`) });
  await expect(settled).toBeVisible();
  row = settled.locator("xpath=..");
  await frame("02", "settled-threads");
  await row.getByRole("button", { name: "Un-settle thread" }).press("Enter");
  await expect(link(page, first.title)).toBeVisible();
  await frame("03");

  row = link(page, first.title).locator("xpath=..");
  await row.getByRole("combobox", { name: "Snooze thread" }).press("Enter");
  await expect(page.getByRole("option", { name: "1 hour", exact: true })).toBeVisible();
  await frame("04", "snooze-options");
  await page.getByRole("option", { name: "1 hour", exact: true }).click();
  await expect(link(page, first.title)).toHaveCount(0);
  await expand(page, "Snoozed");
  await expect(shelf(page, "Snoozed").getByText(first.title, { exact: true })).toBeVisible();
  await frame("05", "snoozed-threads");
  await shelf(page, "Snoozed").getByRole("button", { name: "Wake thread now" }).click();
  await expect(link(page, first.title)).toBeVisible();
  await frame("06");

  for (const close of await page.locator("[data-sonner-toast] [data-close-button]").all()) await close.click();
  await page.keyboard.press("ControlOrMeta+K");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await palette.getByRole("combobox").fill(fixture.threads[3].title);
  await expect(palette.getByRole("option").filter({ hasText: fixture.threads[3].title }).first()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/native-search.png", animations: "disabled" });
  await page.waitForTimeout(900);
  const recording = page.video();
  await page.close();
  await recording.saveAs("e2e-artifacts/demo/walkthrough.webm");
});
