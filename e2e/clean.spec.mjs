import { test, fixture, rpc, shelf, link, expand, reset, open } from "./helpers.mjs";
import { expect } from "@playwright/test";

for (const [theme, width] of [
  ["light", 320],
  ["dark", 320],
  ["light", 280],
]) {
  test(`clean sidebar compact surface ${theme} ${width}`, async ({ page, request }) => {
    await reset(request);
    const [first, , , done] = fixture.threads;
    await rpc(request, "settle", { threadId: done.id });
    await rpc(request, "updateSidebarSettings", {
      threadDisplay: "full",
      workingShelf: false,
      inactiveThreadsEnabled: true,
    });
    await open(page, { theme, width });
    await expect(link(page, first.title)).toBeVisible();
    await page.mouse.move(1000, 750);
    await page.locator("[data-bb-sidebar-root]").screenshot({
      path: `docs/screenshots/before-${theme}-${width}.png`,
      animations: "disabled",
    });
    const selectedUrl = page.url();
    await rpc(request, "updateSidebarSettings", {
      threadDisplay: "compact-all",
      workingShelf: true,
      inactiveThreadsEnabled: false,
    });
    await expect(link(page, first.title).locator("xpath=..")).toHaveClass(/\bh-8\b/);
    await expect(shelf(page, "Active").getByRole("link")).toHaveCount(3);
    await expect(shelf(page, "Settled")).toBeVisible();
    for (const name of ["Inactive", "Parked", "Snoozed"]) await expect(shelf(page, name)).toHaveCount(0);
    await page.locator("[data-bb-sidebar-root]").screenshot({
      path: `docs/screenshots/after-${theme}-${width}.png`,
      animations: "disabled",
    });
    await expand(page, "Settled");
    await expect(link(page, done.title, "Settled")).toBeVisible();
    await rpc(request, "unsettle", { threadId: done.id });
    await expect(link(page, done.title)).toBeVisible();
    expect(page.url()).toBe(selectedUrl);
    await page.reload();
    await expect(link(page, first.title).locator("xpath=..")).toHaveClass(/\bh-8\b/);
  });
}

test("clean sidebar auto-settle settings persist", async ({ page, request }) => {
  await reset(request);
  await open(page);
  await page.getByRole("button", { name: /^Settings \(/ }).click();
  await page.getByRole("link", { name: "BB Sidebar Clean", exact: true }).click();
  const keep = page.getByRole("switch", { name: "Keep threads with a PR" });
  await expect(keep).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("spinbutton", { name: "Days of inactivity before auto-settle" })).toHaveValue("7");
  await expect(page.getByRole("switch", { name: "Inactive shelf" })).not.toBeVisible();
  await keep.click();
  await expect.poll(async () => (await rpc(request, "getSidebarSettings")).autoSettleKeepPullRequests).toBe(true);
  await page.reload();
  await expect(keep).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: "docs/screenshots/auto-settle-settings.png" });
});
