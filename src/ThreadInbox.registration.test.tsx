// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderSlot } from "./test-slot";
import { app, inbox, sidebarSettings, thread, listProps, loadInboxApp } from "./test-inbox";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());

await loadInboxApp();

describe("Shelves registration", () => {
  it("registers exactly one thread list", () => {
    expect(app.threadLists).toHaveLength(1);
    expect(inbox.id).toBe("inbox");
    expect(inbox.title).toBe("Shelves");
  });

  it("registers one custom settings page", () => {
    expect(app.settingsSections).toHaveLength(1);
    expect(sidebarSettings.id).toBe("sidebar-settings");
    expect(sidebarSettings.title).toBeUndefined();
  });
});

describe("Project settings menu item", () => {
  const project = {
    id: "proj_1",
    name: "bb",
    isPersonal: false,
    href: "/projects/proj_1",
    settingsHref: "/settings/projects/proj_1",
  };

  async function openProjectSettingsItem() {
    renderSlot(inbox, listProps, {
      sidebarThreads: { status: "ready", threads: [thread({ title: "Project card" })], projects: [project] },
      rpc: { listLifecycle: () => ({ rows: [] }), projectPathHosts: () => ({ hosts: [] }) },
    });
    const row = screen.getByRole("link", { name: "Project card" });
    // The row had focus before the right-click, e.g. after opening the thread.
    act(() => row.focus());
    await screen.findByRole("dialog", { name: "Thread details" });
    // A real right-click: pointerdown closes the hover card, then the menu opens.
    fireEvent.pointerDown(row, { button: 2, pointerType: "mouse" });
    fireEvent.pointerUp(document, { button: 2, pointerType: "mouse" });
    fireEvent.contextMenu(row);
    fireEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    const item = await screen.findByRole("menuitem", { name: "Project settings" });
    return { row, item };
  }

  it("links Project settings to bb's settings route, not the legacy redirect", async () => {
    const { item } = await openProjectSettingsItem();
    expect(item.getAttribute("href")).toBe("/settings/projects/proj_1");
  });

  it("does not hand focus back to the row, which would reopen its hover card over the settings page", async () => {
    const { row, item } = await openProjectSettingsItem();
    fireEvent.click(item);
    // Radix returns focus on the next tick after the menu unmounts.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(screen.queryByRole("menu", { name: "Thread actions" })).toBeNull();
    expect(document.activeElement).not.toBe(row);
    expect(screen.queryByRole("dialog", { name: "Thread details" })).toBeNull();
  });

  it("still returns focus to the row when the menu closes without navigating", async () => {
    const { row } = await openProjectSettingsItem();
    const menu = screen.getByRole("menu", { name: "Thread actions" });
    fireEvent.keyDown(within(menu).getByRole("menuitem", { name: "Project" }), { key: "Escape" });
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(screen.queryByRole("menu", { name: "Thread actions" })).toBeNull();
    expect(document.activeElement).toBe(row);
  });
});
