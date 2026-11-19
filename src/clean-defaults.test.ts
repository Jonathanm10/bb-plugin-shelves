import { expect, it } from "vitest";
import { DEFAULT_SIDEBAR_SETTINGS } from "./sidebar-settings-values";

it("starts with a compact Working, Active, Settled workflow and T3 auto-settle rules", () => {
  expect(DEFAULT_SIDEBAR_SETTINGS).toMatchObject({
    inactiveThreadsEnabled: false,
    workingShelf: true,
    threadDisplay: "compact-all",
    autoSettleInactive: true,
    autoSettleAfterDays: 7,
    autoSettleOnMerge: true,
    autoSettleKeepPullRequests: false,
  });
});
