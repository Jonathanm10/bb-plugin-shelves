import { test, fixture, rpc, shelf, link, expand, reset, open, menu } from "./helpers.mjs";
import { expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  for (const width of [320, 280]) {
    test(`core sidebar readable surface ${theme} ${width}`, async ({ page, request }) => {
      await reset(request);
      const [first, , , done] = fixture.threads;
      await rpc(request, "settle", { threadId: done.id });
      await rpc(request, "updateSidebarSettings", { threadDisplay: "compact-all" });
      await open(page, { theme, width, core: true });
      await expect(link(page, first.title).locator("xpath=..")).toHaveClass(/\bh-8\b/);
      await page.mouse.move(1000, 750);
      await page
        .locator("[data-bb-sidebar-root]")
        .screenshot({ path: `docs/screenshots/before-${theme}-${width}.png`, animations: "disabled" });
      const selectedUrl = page.url();
      await rpc(request, "updateSidebarSettings", { threadDisplay: "full" });
      const row = link(page, first.title).locator("xpath=..");
      await expect(row).not.toHaveClass(/\bh-8\b/);
      expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(48);
      await expect(shelf(page, "Active").getByRole("link")).toHaveCount(3);
      await expect(shelf(page, "Settled")).toBeVisible();
      for (const name of ["Inactive", "Parked", "Snoozed"]) await expect(shelf(page, name)).toHaveCount(0);
      await page
        .locator("[data-bb-sidebar-root]")
        .screenshot({ path: `docs/screenshots/after-${theme}-${width}.png`, animations: "disabled" });
      await row.hover();
      await row.getByRole("button", { name: "Settle thread" }).focus();
      await page
        .locator("[data-bb-sidebar-root]")
        .screenshot({ path: `docs/screenshots/actions-${theme}-${width}.png`, animations: "disabled" });
      expect(page.url()).toBe(selectedUrl);
      await page.reload();
      await expect(link(page, first.title).locator("xpath=..")).not.toHaveClass(/\bh-8\b/);
    });
  }
}

for (const threadDisplay of ["full", "compact-all"]) {
  test(`core sidebar filing with keyboard and Undo in ${threadDisplay}`, async ({ page, request }) => {
    await reset(request);
    await rpc(request, "updateSidebarSettings", { threadDisplay });
    await open(page, { core: true });
    const first = fixture.threads[0];
    const selectedUrl = page.url();
    let row = link(page, first.title).locator("xpath=..");
    await row.getByRole("combobox", { name: "Snooze thread" }).press("Enter");
    await page.getByRole("option", { name: "1 hour", exact: true }).click();
    await expect(shelf(page, "Snoozed")).toBeVisible();
    await expect(link(page, first.title)).toHaveCount(0);
    await expand(page, "Snoozed");
    await shelf(page, "Snoozed").getByRole("button", { name: "Wake thread now" }).click();
    await expect(link(page, first.title)).toBeVisible();
    row = link(page, first.title).locator("xpath=..");
    await row.getByRole("button", { name: "Settle thread" }).press("Enter");
    await expect(link(page, first.title)).toHaveCount(0);
    const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Thread settled" }).last();
    await toast.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(link(page, first.title)).toBeVisible();
    const actions = await menu(page, first.title);
    await expect(actions.getByRole("menuitem", { name: "Park thread", exact: true })).toHaveCount(0);
    await expect(actions.getByText("Snooze", { exact: true })).toBeVisible();
    await actions.getByRole("menuitem", { name: "Settle", exact: true }).click();
    await expect(link(page, first.title)).toHaveCount(0);
    await expand(page, "Settled");
    await shelf(page, "Settled").getByRole("button", { name: "Un-settle thread" }).click();
    await expect(link(page, first.title)).toBeVisible();
    expect(page.url()).toBe(selectedUrl);
    expect((await rpc(request, "listLifecycle")).rows.find((row) => row.threadId === first.id)?.settledOverride).toBe(
      "active",
    );
    await page.reload();
    await expect(link(page, first.title)).toBeVisible();
  });
}

test("core sidebar auto-settle settings persist", async ({ page, request }) => {
  await reset(request);
  await open(page, { core: true });
  await page.getByRole("button", { name: /^Settings \(/ }).click();
  await page.getByRole("link", { name: "BB Sidebar Clean", exact: true }).click();
  const keep = page.getByRole("switch", { name: "Keep threads with a PR" });
  await expect(keep).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Working shelf" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Days of inactivity before auto-settle" })).toHaveValue("7");
  await expect(page.getByRole("switch", { name: "Inactive shelf" })).not.toBeVisible();
  await keep.click();
  await expect.poll(async () => (await rpc(request, "getSidebarSettings")).autoSettleKeepPullRequests).toBe(true);
  await page.reload();
  await expect(keep).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: "docs/screenshots/auto-settle-settings.png" });
});

test("core sidebar keeps filed threads in native search", async ({ page, request }) => {
  await reset(request);
  const first = fixture.threads[0];
  await rpc(request, "settle", { threadId: first.id });
  await open(page, { core: true });
  await page.keyboard.press("ControlOrMeta+K");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  const search = palette.getByRole("combobox");
  await search.fill(first.title);
  await palette.getByRole("option").filter({ hasText: first.title }).first().click();
  await expect(page).toHaveURL(new RegExp(first.id));
});

test.describe("core sidebar touch", () => {
  test.use({ hasTouch: true, isMobile: true });
  test("keeps snooze and settle reachable without hover", async ({ page, request }) => {
    await reset(request);
    await open(page, { core: true });
    expect(await page.evaluate(() => matchMedia("(hover: none)").matches)).toBe(true);
    const row = link(page, fixture.threads[0].title).locator("xpath=..");
    const snooze = row.getByRole("combobox", { name: "Snooze thread" });
    await expect(snooze.locator("..")).toHaveCSS("opacity", "1");
    await snooze.tap();
    await page.getByRole("option", { name: "1 hour", exact: true }).tap();
    await expect(shelf(page, "Snoozed")).toBeVisible();
  });
});
