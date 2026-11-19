// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderSlot } from "./test-slot";
import { inbox, thread, listProps, defaultSidebarSettings, deferred, loadInboxApp } from "./test-inbox";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());
await loadInboxApp();

it("keeps a thread menu open when loaded settings enable the bottom dock", async () => {
  const settings = deferred<typeof defaultSidebarSettings>();
  const pin = vi.fn(() => ({ ok: true }));
  const slot = renderSlot(inbox, listProps, {
    sidebarThreads: {
      status: "ready",
      threads: [thread({ id: "keep", title: "Keep this menu", updatedAt: Date.now() })],
      projects: [],
    },
    rpc: { getSidebarSettings: () => settings.promise, listLifecycle: () => ({ rows: [] }), pin },
  });
  fireEvent.contextMenu(screen.getByRole("link", { name: "Keep this menu" }));
  expect(await screen.findByRole("menu", { name: "Thread actions" })).toBeDefined();
  await act(async () =>
    settings.resolve({ ...defaultSidebarSettings, inactiveThreadsEnabled: false, dockShelves: true }),
  );
  await waitFor(() => expect(slot.container.querySelector("[data-shelf-dock]")).not.toBeNull());
  fireEvent.click(screen.getByRole("menuitem", { name: "Pin" }));
  await waitFor(() => expect(pin).toHaveBeenCalledWith({ threadId: "keep" }));
});
