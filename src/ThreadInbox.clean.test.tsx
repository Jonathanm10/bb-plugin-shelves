// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { createWired } from "./test-wired";
import { loadInboxApp, thread } from "./test-inbox";
import { DEFAULT_SIDEBAR_SETTINGS } from "./sidebar-settings-values";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());
await loadInboxApp();

it("settles quiet work and wakes it on activity without changing the selected thread", async () => {
  localStorage.clear();
  const now = Date.now();
  const old = now - 8 * 86_400_000;
  const wired = await createWired([
    thread({ id: "busy", title: "Running task", status: "active", indicator: "runtime", updatedAt: now }),
    thread({ id: "recent", title: "Recent result", updatedAt: now }),
    thread({ id: "quiet", title: "Quiet task", createdAt: old, updatedAt: old, latestAttentionAt: old }),
  ]);
  const slot = wired.mount();
  const working = await screen.findByRole("region", { name: "Working" });
  expect(within(working).getByRole("button", { expanded: false })).toBeDefined();
  fireEvent.click(within(working).getByRole("button", { expanded: false }));
  await within(working).findByRole("link", { name: "Running task" });
  const active = screen.getByRole("region", { name: "Active" });
  await within(active).findByRole("link", { name: "Recent result" });
  expect(screen.queryByRole("region", { name: "Inactive" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Parked" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Snoozed" })).toBeNull();
  expect(screen.getByRole("link", { name: "Recent result" }).closest("[data-parent-card]")!.classList).not.toContain(
    "h-8",
  );
  fireEvent.contextMenu(screen.getByRole("link", { name: "Recent result" }));
  const menu = await screen.findByRole("menu", { name: "Thread actions" });
  expect(within(menu).queryByRole("menuitem", { name: "Park thread" })).toBeNull();
  expect(within(menu).getByText("Snooze")).toBeDefined();
  expect(within(menu).getByRole("menuitem", { name: "Settle" })).toBeDefined();
  fireEvent.keyDown(menu, { key: "Escape" });

  // The mounted sidebar evaluates immediately; no manual filing or tab change.

  const settled = await screen.findByRole("region", { name: "Settled" });
  expect(within(settled).queryByRole("button", { name: "Close terminals and ports of settled threads" })).toBeNull();
  expect(within(active).queryByRole("link", { name: "Quiet task" })).toBeNull();
  fireEvent.click(within(settled).getByRole("button", { expanded: false }));
  expect(within(settled).getByRole("link", { name: /Quiet task$/ })).toBeDefined();

  await wired.event("thread.active", "quiet");
  await within(screen.getByRole("region", { name: "Active" })).findByRole("link", { name: "Quiet task" });
  await waitFor(() => expect(screen.queryByRole("region", { name: "Settled" })).toBeNull());
  expect(slot.inspection.navigateCalls).toEqual([]);
  expect(wired.harness.inspection.sdk.callsTo("threads.archive")).toHaveLength(0);
});

it("shows auto-settle controls first and persists the PR protection switch", async () => {
  localStorage.clear();
  const wired = await createWired([]);
  const slot = wired.mount("settings");
  const keep = await screen.findByRole("switch", { name: "Keep threads with a PR" });
  expect(keep.getAttribute("aria-checked")).toBe("false");
  expect(screen.getByRole("spinbutton", { name: "Days of inactivity before auto-settle" })).toHaveProperty(
    "value",
    "7",
  );
  expect(screen.getByRole("switch", { name: "Inactive shelf" }).closest("details")!.open).toBe(false);
  expect(screen.getByText("Advanced settings").closest("details")!.open).toBe(false);
  expect(screen.queryByText("Project appearance")).toBeNull();
  expect(screen.queryByText("Project management")).toBeNull();
  expect(screen.getByRole("switch", { name: "Working shelf" }).closest("details")).toBeNull();
  fireEvent.click(keep);
  await waitFor(async () => {
    expect(await wired.call("getSidebarSettings")).toEqual({
      ...DEFAULT_SIDEBAR_SETTINGS,
      autoSettleKeepPullRequests: true,
    });
  });
  wired.unmount(slot);
  wired.mount("settings");
  expect((await screen.findByRole("switch", { name: "Keep threads with a PR" })).getAttribute("aria-checked")).toBe(
    "true",
  );
});

it.each(["full", "compact-all"] as const)("keeps filing actions usable with %s rows", async (threadDisplay) => {
  localStorage.clear();
  const wired = await createWired([
    thread({
      id: "file",
      title: "File this result",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      latestAttentionAt: Date.now(),
    }),
  ]);
  await wired.call("updateSidebarSettings", { threadDisplay });
  wired.mount();
  const link = await screen.findByRole("link", { name: "File this result" });
  const row = link.closest("li")!;
  await waitFor(() =>
    expect(row.querySelector("[data-parent-card]")!.classList.contains("h-8")).toBe(threadDisplay === "compact-all"),
  );
  fireEvent.keyDown(within(row).getByRole("combobox", { name: "Snooze thread" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: "1 hour" }));
  await waitFor(() =>
    expect(
      wired.db.prepare("SELECT snoozed_until FROM thread_lifecycle WHERE thread_id = ?").get("file"),
    ).toMatchObject({ snoozed_until: expect.any(Number) }),
  );
  await wired.flush();
  const snoozed = await screen.findByRole("region", { name: "Snoozed" });
  fireEvent.click(within(snoozed).getByRole("button", { expanded: false }));
  fireEvent.click(within(snoozed).getByRole("button", { name: "Wake thread now" }));
  await waitFor(() =>
    expect(
      wired.db.prepare("SELECT snoozed_until FROM thread_lifecycle WHERE thread_id = ?").get("file"),
    ).toBeUndefined(),
  );
  await wired.flush();
  const active = await screen.findByRole("region", { name: "Active" });
  const restored = await within(active).findByRole("link", { name: "File this result" });
  fireEvent.contextMenu(restored);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Settle" }));
  await waitFor(() =>
    expect(wired.db.prepare("SELECT settled_at FROM thread_lifecycle WHERE thread_id = ?").get("file")).toMatchObject({
      settled_at: expect.any(Number),
    }),
  );
  await wired.flush();
  const settled = await screen.findByRole("region", { name: "Settled" });
  fireEvent.click(within(settled).getByRole("button", { expanded: false }));
  fireEvent.click(within(settled).getByRole("button", { name: "Un-settle thread" }));
  await waitFor(() =>
    expect(
      wired.db.prepare("SELECT settled_override FROM thread_lifecycle WHERE thread_id = ?").get("file"),
    ).toMatchObject({ settled_override: "active" }),
  );
  await wired.flush();
  expect(await within(active).findByRole("link", { name: "File this result" })).toBeDefined();
});

it("puts the latest return first on a new device", async () => {
  localStorage.clear();
  const now = Date.now();
  const wired = await createWired([
    thread({ id: "renamed", title: "Renamed", createdAt: now, updatedAt: now, latestAttentionAt: now - 100 }),
    thread({
      id: "returned",
      title: "Just finished",
      createdAt: now - 1000,
      updatedAt: now - 10,
      latestAttentionAt: now,
    }),
  ]);
  wired.mount();
  await screen.findByRole("button", { name: "Sort active threads: Recent returns" });
  const active = screen.getByRole("region", { name: "Active" });
  expect(
    within(active)
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label")),
  ).toEqual(["Just finished", "Renamed"]);
});

it("can defer a pending question from its row without stopping the agent", async () => {
  localStorage.clear();
  const wired = await createWired([
    thread({
      id: "question",
      title: "Needs a decision",
      hasPendingInteraction: true,
      indicator: "waiting-for-input",
      updatedAt: Date.now(),
    }),
  ]);
  wired.mount();
  const row = (await screen.findByRole("link", { name: "Needs a decision" })).closest("li")!;
  expect(within(row).queryByRole("button", { name: "Settle thread" })).toBeNull();
  fireEvent.keyDown(within(row).getByRole("combobox", { name: "Snooze thread" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: "1 hour" }));
  await waitFor(() =>
    expect(
      wired.db
        .prepare("SELECT snoozed_pending_interaction AS pending FROM thread_lifecycle WHERE thread_id = ?")
        .get("question"),
    ).toEqual({ pending: 1 }),
  );
  await wired.flush();
  expect(await screen.findByRole("region", { name: "Snoozed" })).toBeDefined();
  expect(wired.harness.inspection.sdk.callsTo("threads.stop")).toHaveLength(0);
});
