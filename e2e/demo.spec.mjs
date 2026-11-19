import { mkdirSync, writeFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { test, fixture, reset, rpc, open, link, shelf, expand } from "./helpers.mjs";

// Capture real interactions against disposable BB data, with no mocked browser responses.
test("README demo settles, restores, snoozes, wakes, and searches a thread", async ({ browser, request }) => {
  await reset(request);
  const first = fixture.threads[0];
  await rpc(request, "settle", { threadId: fixture.threads[3].id });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    recordVideo: { dir: "e2e-artifacts/demo/raw", size: { width: 1100, height: 800 } },
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "UTC",
  });
  const recordingStarted = Date.now();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, { core: true, theme: "dark" });
  const trimStartSeconds = (Date.now() - recordingStarted) / 1000 + 0.3;
  mkdirSync("e2e-artifacts/demo", { recursive: true });
  // Screenshots can temporarily resize the capture surface. Record interactions only.
  async function frame() {
    await page.mouse.move(1000, 750);
    await page.waitForTimeout(1200);
  }

  let row = link(page, first.title).locator("xpath=..");
  await row.getByRole("button", { name: "Settle thread" }).focus();
  await frame();
  await row.getByRole("button", { name: "Settle thread" }).press("Enter");
  await expect(link(page, first.title)).toHaveCount(0);
  await expand(page, "Settled");
  const settled = shelf(page, "Settled").getByRole("link", { name: new RegExp(`${first.title}$`) });
  await expect(settled).toBeVisible();
  row = settled.locator("xpath=..");
  await frame();
  await row.getByRole("button", { name: "Un-settle thread" }).press("Enter");
  await expect(link(page, first.title)).toBeVisible();
  await frame();

  row = link(page, first.title).locator("xpath=..");
  await row.getByRole("combobox", { name: "Snooze thread" }).press("Enter");
  await expect(page.getByRole("option", { name: "1 hour", exact: true })).toBeVisible();
  await frame();
  await page.getByRole("option", { name: "1 hour", exact: true }).click();
  await expect(link(page, first.title)).toHaveCount(0);
  await expand(page, "Snoozed");
  await expect(shelf(page, "Snoozed").getByText(first.title, { exact: true })).toBeVisible();
  await frame();
  await shelf(page, "Snoozed").getByRole("button", { name: "Wake thread now" }).click();
  await expect(link(page, first.title)).toBeVisible();
  await frame();

  for (const close of await page.locator("[data-sonner-toast] [data-close-button]").all()) await close.click();
  await page.getByRole("button", { name: "Search threads", exact: true }).click();
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await palette.getByRole("combobox").fill(fixture.threads[3].title);
  await expect(palette.getByRole("option").filter({ hasText: fixture.threads[3].title }).first()).toBeVisible();
  await page.waitForTimeout(1200);
  const recording = page.video();
  writeFileSync("e2e-artifacts/demo/timing.json", JSON.stringify({ trimStartSeconds }));
  await context.close();
  expect(errors).toEqual([]);
  await recording.saveAs("e2e-artifacts/demo/walkthrough.webm");
});
