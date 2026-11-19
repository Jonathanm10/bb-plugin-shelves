import { expect, it } from "vitest";
import { DEFAULT_SIDEBAR_SETTINGS } from "./sidebar-settings-values";

it("starts with readable Working, Active, Settled cards and T3 auto-settle rules", () => {
  expect(DEFAULT_SIDEBAR_SETTINGS).toMatchObject({
    inactiveThreadsEnabled: false,
    workingShelf: true,
    dockShelves: true,
    showRunningChildrenWhenCollapsed: false,
    threadDisplay: "full",
    compactWorkingThreads: false,
    autoSettleInactive: true,
    autoSettleAfterDays: 7,
    autoSettleOnMerge: true,
    autoSettleKeepPullRequests: false,
  });
});
