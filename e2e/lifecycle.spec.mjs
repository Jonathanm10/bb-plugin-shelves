import { expect } from "@playwright/test";
import { test, fixture, cli, rpc, shelf, link, menu, expand, reset, open } from "./helpers.mjs";

test.beforeEach(async ({ request, page }) => {
  await reset(request);
  await open(page);
});

test("legacy Parked rows resume and persist across reload", async ({ page, request }) => {
  const thread = fixture.threads[0];
  await rpc(request, "park", { threadId: thread.id });
  await expect(shelf(page, "Parked")).toBeVisible();
  await expand(page, "Parked");
  await expect(link(page, thread.title, "Parked")).toBeVisible();
  await expect(link(page, thread.title)).toHaveCount(0);
  await expect
    .poll(async () => (await rpc(request, "listLifecycle")).rows.find((row) => row.threadId === thread.id)?.parkedAt)
    .toBeGreaterThan(0);
  await page.reload();
  await expand(page, "Parked");
  await expect(link(page, thread.title, "Parked")).toBeVisible();
  await expect(link(page, thread.title)).toHaveCount(0);
  await (await menu(page, thread.title, "Parked")).getByRole("menuitem", { name: "Resume", exact: true }).click();
  await expect(link(page, thread.title)).toBeVisible();
  await expect(link(page, thread.title, "Parked")).toHaveCount(0);
  expect(
    (await rpc(request, "listLifecycle")).rows.find((row) => row.threadId === thread.id)?.parkedAt ?? null,
  ).toBeNull();
  await page.reload();
  await expect(link(page, thread.title)).toBeVisible();
  await expect(link(page, thread.title, "Parked")).toHaveCount(0);
});

test("palette commands snooze and unsnooze the thread in view", async ({ page, request }) => {
  const thread = fixture.threads[0];
  const snoozedUntil = async () =>
    (await rpc(request, "listLifecycle")).rows.find((row) => row.threadId === thread.id)?.snoozedUntil ?? null;
  const runCommand = async (title) => {
    // bb hands commands the thread in view as the palette opens, and only once
    // the thread's page has rendered; a palette opened right after a click on
    // a row lists no thread commands.
    await expect(page.getByRole("textbox", { name: /^Ask for a follow-up/ })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+K");
    const palette = page.getByRole("dialog");
    await expect(palette).toBeVisible();
    // The palette can open on thread search, where Escape returns to its
    // commands; on the commands themselves Escape would close it.
    const search = palette.getByRole("combobox", { name: "Search commands" });
    if (!(await search.isVisible())) await page.keyboard.press("Escape");
    await expect(search).toBeFocused();
    await search.fill(title);
    await palette.getByRole("option", { name: title }).click();
  };

  test.setTimeout(120_000);
  await link(page, thread.title).click();
  await expect(page).toHaveURL(new RegExp(thread.id));
  // Opening a seeded thread may start its runtime, and a working thread cannot be snoozed.
  const working = shelf(page, "Active")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: new RegExp(`${thread.title}$`) }) })
    .getByLabel("Thread working");
  await expect(async () => {
    if (await working.count()) await cli(["thread", "stop", thread.id]);
    await expect(working).toHaveCount(0);
    await runCommand("BB Sidebar: Snooze this thread for 1 hour");
    await expect.poll(snoozedUntil, { timeout: 3_000 }).not.toBeNull();
  }).toPass({ timeout: 60_000 });
  await expand(page, "Snoozed");
  await expect(link(page, thread.title, "Snoozed")).toBeVisible();
  await expect(link(page, thread.title)).toHaveCount(0);
  await expect.poll(snoozedUntil).toBeGreaterThan(Date.now() + 59 * 60_000);

  await link(page, thread.title, "Snoozed").click();
  await expect(page).toHaveURL(new RegExp(thread.id));
  await runCommand("BB Sidebar: Unsnooze this thread");
  await expect(link(page, thread.title)).toBeVisible();
  await expect.poll(snoozedUntil).toBeNull();
});
