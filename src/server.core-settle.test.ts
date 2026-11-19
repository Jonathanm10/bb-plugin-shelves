import { expect, it } from "vitest";
import { makeThreadResponse } from "@get-bb/plugin-sdk/testing";
import plugin from "./server";
import {
  createFakePluginHost,
  disposers,
  projectThread,
  projectsWith,
  terminalSession,
  availablePullRequest,
  pullRequestStatus,
  type LifecycleListResult,
} from "./test-server";

async function setup() {
  const old = Date.now() - 8 * 86_400_000;
  const thread = projectThread({
    id: "quiet",
    createdAt: old,
    updatedAt: old,
    latestAttentionAt: old,
    environmentId: "env_quiet",
  });
  const batches: string[][] = [];
  const { bb, harness } = createFakePluginHost({
    pluginId: "bb-sidebar-clean",
    sdk: {
      projects: { list: async () => projectsWith([thread]) },
      threads: {
        list: async () => [thread],
        get: async () => makeThreadResponse(thread),
        stop: async () => ({ ok: true }),
      },
      terminals: {
        list: async () => ({ sessions: [terminalSession({ id: "left-running" })] }),
        close: async () => terminalSession({ id: "left-running", status: "exited" }),
      },
      plugins: { callRpc: pullRequestStatus(() => availablePullRequest("merged"), batches) },
    },
  });
  await plugin(bb);
  disposers.push(() => harness.lifecycle.dispose());
  return { thread, harness, batches };
}

it.each(["settle", "evaluateAutoSettle"])("%s files work without releasing runtimes or terminals", async (method) => {
  const { harness } = await setup();
  await harness.behavior.callRpc(method, method === "settle" ? { threadId: "quiet" } : {});
  const result = (await harness.behavior.callRpc("listLifecycle", {})) as LifecycleListResult;
  expect(result.rows[0]?.settledAt).toEqual(expect.any(Number));
  expect(harness.inspection.sdk.callsTo("threads.stop")).toHaveLength(0);
  expect(harness.inspection.sdk.callsTo("terminals.list")).toHaveLength(0);
  expect(harness.inspection.sdk.callsTo("terminals.close")).toHaveLength(0);
});

it("keeps auto-settled work filed across rule changes and restart without looking up its PR", async () => {
  const { harness, batches } = await setup();
  await harness.behavior.callRpc("evaluateAutoSettle", {});
  const before = await harness.behavior.callRpc("listLifecycle", {});
  await harness.behavior.callRpc("updateSidebarSettings", {
    autoSettleInactive: false,
    autoSettleOnMerge: false,
    autoSettleKeepPullRequests: true,
  });
  await harness.behavior.callRpc("evaluateAutoSettle", {});
  expect(await harness.behavior.callRpc("listLifecycle", {})).toEqual(before);
  const reloaded = (await harness.lifecycle.reload(plugin)).harness;
  disposers.push(() => reloaded.lifecycle.dispose());
  await reloaded.behavior.callRpc("evaluateAutoSettle", {});
  expect(await reloaded.behavior.callRpc("listLifecycle", {})).toEqual(before);
  expect(batches).toEqual([["env_quiet"]]);
});

it("wakes auto-settled work on new attention without a PR lookup", async () => {
  const { harness, thread, batches } = await setup();
  await harness.behavior.callRpc("evaluateAutoSettle", {});
  thread.latestAttentionAt = Date.now() + 100;
  expect(await harness.behavior.callRpc("evaluateAutoSettle", {})).toEqual({ changedThreadIds: ["quiet"] });
  expect(await harness.behavior.callRpc("listLifecycle", {})).toEqual({ rows: [] });
  expect(batches).toEqual([["env_quiet"]]);
});
