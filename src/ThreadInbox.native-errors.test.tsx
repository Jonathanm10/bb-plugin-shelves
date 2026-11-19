// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import { inbox, listProps, loadInboxApp, thread } from "./test-inbox";
import { renderSlot } from "./test-slot";

await loadInboxApp();

it("keeps provider failures visible without replacing native status with a Continue scheduler", async () => {
  const limits = vi.fn(() => ({
    failed: { message: "Session limit", resetsAt: Date.now() + 60_000, timeZone: "UTC", scheduled: null },
  }));
  const slot = renderSlot(inbox, listProps, {
    sidebarThreads: {
      status: "ready",
      threads: [thread({ id: "failed", title: "Failed work", status: "error", indicator: "unread-error" })],
      projects: [],
    },
    rpc: { getThreadLimits: limits },
  });
  const row = (await screen.findByRole("link", { name: "Failed work" })).closest("li")!;
  await waitFor(() => expect(within(row).getByText("Failed")).toBeDefined());
  expect(within(row).queryByRole("button", { name: /Continue/i })).toBeNull();
  await act(async () => {});
  expect(slot.rpcCalls.some((call) => call.method === "getThreadLimits")).toBe(false);
});
