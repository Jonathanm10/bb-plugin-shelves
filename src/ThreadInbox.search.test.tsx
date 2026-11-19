// @vitest-environment jsdom
import { expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderSlot } from "./test-slot";
import { inbox, listProps, loadInboxApp, thread } from "./test-inbox";

await loadInboxApp();

it("opens BB search from a labeled button even when the host navigation item is hidden", () => {
  const rendered = renderSlot(inbox, listProps, {
    sidebarThreads: { status: "ready", projects: [], threads: [thread()] },
    sidebarNavigation: { items: [] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search threads" }));
  expect(rendered.inspection.sidebarNavigationCalls).toEqual([
    { method: "activate", itemId: "__bb__/search-threads", target: "current" },
  ]);
});
