import { test, fixture, rpc, shelf, link, expand, reset, open, menu, cli } from "./helpers.mjs";
import { expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  for (const width of [320, 280]) {
    test(`core sidebar readable surface ${theme} ${width}`, async ({ page, request }) => {
      await reset(request);
      const [first, , , done] = fixture.threads;
      await rpc(request, "settle", { threadId: done.id });
      await open(page, { theme, width, core: true });
      const selectedUrl = page.url();
      await page.mouse.move(1000, 750);
      const row = link(page, first.title).locator("xpath=..");
      await expect(row).not.toHaveClass(/\bh-8\b/);
      expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(48);
      await expect(shelf(page, "Active").getByRole("link")).toHaveCount(3);
      await expect(shelf(page, "Settled")).toBeVisible();
      for (const name of ["Inactive", "Parked", "Snoozed"]) await expect(shelf(page, name)).toHaveCount(0);
      await page
        .locator("[data-bb-sidebar-root]")
        .screenshot({ path: `docs/screenshots/sidebar-${theme}-${width}.png`, animations: "disabled" });
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
    await link(page, first.title).focus();
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
  await page.getByRole("link", { name: "Thread Inbox", exact: true }).click();
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
  await cli(["settings", "ui", "set", "sidebar.visiblePluginPanels", "[]"]);
  await open(page, { core: true });
  const trigger = page.getByRole("button", { name: "Search threads", exact: true });
  await expect(trigger).toBeVisible();
  await expect(trigger.locator("svg")).toBeVisible();
  await trigger.click();
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  const search = palette.getByRole("combobox");
  await search.fill(first.title);
  await palette.getByRole("option").filter({ hasText: first.title }).first().click();
  await expect(page).toHaveURL(new RegExp(first.id));
  await cli(["settings", "ui", "reset", "sidebar.visiblePluginPanels"]);
});

for (const theme of ["light", "dark"]) {
  test(`core sidebar settings layout ${theme}`, async ({ page, request }) => {
    await reset(request);
    await page.setViewportSize({ width: 1100, height: 1050 });
    await open(page, { core: true, theme });
    await page.getByRole("button", { name: /^Settings \(/ }).click();
    await page.getByRole("link", { name: "Thread Inbox", exact: true }).click();
    const behavior = page.locator("#settings-thread-behavior");
    const sidebar = page.locator("#settings-sidebar");
    await expect(behavior.getByRole("switch", { name: "Keep threads with a PR" })).toBeVisible();
    const snooze = behavior.locator("summary");
    const help = sidebar.locator("p").last();
    for (const [card, content] of [
      [behavior, snooze],
      [sidebar, help],
    ]) {
      const outer = await card.boundingBox();
      const inner = await content.evaluate((element) => {
        const text = document.createRange();
        text.selectNodeContents(element);
        const bounds = text.getBoundingClientRect();
        return { x: bounds.x, width: bounds.width };
      });
      expect(inner.x - outer.x).toBeGreaterThanOrEqual(16);
      expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width - 15);
    }
    await snooze.click();
    await expect(page.getByRole("textbox", { name: "Snooze shortcuts" })).toBeVisible();
    await snooze.click();
    const advanced = page.getByText("Advanced settings", { exact: true });
    await advanced.click();
    await expect(page.getByRole("combobox", { name: "Thread display" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Inactive shelf" })).toHaveCount(0);
    await advanced.click();
    await page.screenshot({ path: `docs/screenshots/settings-${theme}.png`, animations: "disabled" });
  });
}

test("core sidebar compact titles keep space until actions are needed", async ({ page, request }) => {
  await reset(request);
  await rpc(request, "updateSidebarSettings", { threadDisplay: "compact-all" });
  await open(page, { core: true });
  await page.mouse.move(1000, 750);
  const row = link(page, fixture.threads[0].title).locator("xpath=..");
  expect((await row.locator("[data-settle-fade]").boundingBox()).width).toBeGreaterThan(160);
  const settle = row.getByRole("button", { name: "Settle thread" });
  await expect(settle).toBeHidden();
  await link(page, fixture.threads[0].title).focus();
  await expect(settle).toBeVisible();
  const snooze = row.getByRole("combobox", { name: "Snooze thread" });
  await snooze.press("Enter");
  await expect(page.getByRole("option", { name: "1 hour", exact: true })).toBeVisible();
  await expect(snooze).toBeVisible();
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
