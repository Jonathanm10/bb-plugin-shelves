import { expect, it } from "vitest";
import plugin from "./server";
import { createFakePluginHost, disposers, projectThread, projectsWith, type LifecycleListResult } from "./test-server";
import { resolveShelf, resolveWakeReason } from "./lifecycle";

const signals = {
  hasPendingInteraction: true,
  hasQueuedWork: false,
  isWorking: true,
  hasBackgroundWork: false,
  isUnread: true,
  latestAttentionAt: 100,
};
it("snoozes an existing question without answering or releasing its runtime", async () => {
  const thread = projectThread({
    id: "question",
    status: "active",
    hasPendingInteraction: true,
    latestAttentionAt: 100,
  });
  const { bb, harness } = createFakePluginHost({
    pluginId: "bb-thread-inbox",
    sdk: { projects: { list: async () => projectsWith([thread]) } },
  });
  await plugin(bb);
  disposers.push(() => harness.lifecycle.dispose());
  const until = Date.now() + 3_600_000;
  await harness.behavior.callRpc("snooze", { threadId: thread.id, snoozedUntil: until });
  const {
    rows: [row],
  } = (await harness.behavior.callRpc("listLifecycle", {})) as LifecycleListResult;
  expect(row).toMatchObject({ snoozedPendingInteraction: true });
  expect(resolveShelf(row, signals, Date.now())).toBe("snoozed");
  expect(resolveWakeReason(row, signals, Date.now())).toBeNull();
  expect(resolveShelf(row, { ...signals, latestAttentionAt: until }, Date.now())).toBe("active");
  expect(resolveShelf(row, signals, until)).toBe("active");
  expect(harness.inspection.sdk.callsTo("threads.stop")).toHaveLength(0);
  expect(harness.inspection.sdk.callsTo("terminals.close")).toHaveLength(0);
  expect(thread.hasPendingInteraction).toBe(true);
  const reloaded = (await harness.lifecycle.reload(plugin)).harness;
  disposers.push(() => reloaded.lifecycle.dispose());
  const restored = (await reloaded.behavior.callRpc("listLifecycle", {})) as LifecycleListResult;
  expect(resolveShelf(restored.rows[0], signals, Date.now())).toBe("snoozed");
});

it.each([
  { status: "active" as const },
  { queuedWork: "waiting" as const },
  {
    hasPendingInteraction: true,
    activity: {
      activeWorkflowCount: 1,
      activeBackgroundAgentCount: 0,
      activeBackgroundCommandCount: 0,
      activePlanModeCount: 0,
    },
  },
])("rejects snoozing busy or queued work: %j", async (change) => {
  const { bb, harness } = createFakePluginHost({
    pluginId: "bb-thread-inbox",
    sdk: { projects: { list: async () => projectsWith([projectThread({ id: "busy", ...change })]) } },
  });
  await plugin(bb);
  disposers.push(() => harness.lifecycle.dispose());
  await expect(
    harness.behavior.callRpc("snooze", { threadId: "busy", snoozedUntil: Date.now() + 60_000 }),
  ).rejects.toThrow(/working|queued/);
  expect(harness.inspection.sdk.callsTo("threads.unpin")).toHaveLength(0);
  expect(harness.inspection.sdk.callsTo("threads.stop")).toHaveLength(0);
  expect(await harness.behavior.callRpc("listLifecycle", {})).toEqual({ rows: [] });
});
