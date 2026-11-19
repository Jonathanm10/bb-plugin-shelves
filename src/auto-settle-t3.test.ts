import { describe, expect, it } from "vitest";
import { decideAutoSettle, type AutoSettleThread } from "./auto-settle";

const DAY = 86_400_000;
const now = 20 * DAY;
const thread: AutoSettleThread = {
  createdAt: DAY,
  updatedAt: DAY,
  latestAttentionAt: DAY,
  pinnedAt: null,
  status: "idle",
  hasPendingInteraction: false,
  queuedWork: "none",
  activity: {
    activeBackgroundAgentCount: 0,
    activeBackgroundCommandCount: 0,
    activePlanModeCount: 0,
    activeWorkflowCount: 0,
  },
};

function decide(state: "open" | "draft" | "merged" | "closed", keepPullRequests = false, onMerge = true) {
  return decideAutoSettle({
    lifecycle: null,
    now,
    thread,
    settings: { afterDays: 7, onMerge, keepPullRequests },
    pullRequest: { outcome: "available", state, updatedAt: new Date(now).toISOString() },
  });
}

describe("T3 automatic settling", () => {
  it.each(["open", "draft"] as const)("lets an inactive %s PR settle unless Keep threads with a PR is on", (state) => {
    expect(decide(state)).toBe("settle");
    expect(decide(state, true)).toBe("keep");
  });

  it("settles closed PRs even when merged-PR settling is off", () => {
    expect(
      decideAutoSettle({
        lifecycle: null,
        now,
        thread,
        settings: { afterDays: null, onMerge: false, keepPullRequests: true },
        pullRequest: { outcome: "available", state: "closed", updatedAt: new Date(now).toISOString() },
      }),
    ).toBe("settle");
  });

  it("keeps inactive merged PRs when Keep threads with a PR is on and merge settling is off", () => {
    expect(decide("merged", true, false)).toBe("keep");
    expect(decide("merged", true, true)).toBe("settle");
  });

  it("keeps recent work active", () => {
    expect(
      decideAutoSettle({
        lifecycle: null,
        now,
        thread: { ...thread, updatedAt: now - DAY },
        settings: { afterDays: 7, onMerge: true, keepPullRequests: false },
        pullRequest: { outcome: "absent" },
      }),
    ).toBe("keep");
  });
});
