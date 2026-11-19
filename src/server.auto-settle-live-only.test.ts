import { describe, expect, it } from "vitest";
import plugin from "./server";
import {
  availablePullRequest,
  createLegacyPolicyHost as createFakePluginHost,
  disposers,
  projectThread,
  projectsWith,
  pullRequestStatus,
  type LifecycleListResult,
  type ProjectThread,
} from "./test-server";

const old = Date.now() - 4 * 24 * 60 * 60 * 1_000;
const quiet = { createdAt: old, updatedAt: old, latestAttentionAt: old, status: "idle" as const };

type Row =
  | { outcome: "absent" }
  | { outcome: "unavailable"; message: string }
  | ReturnType<typeof availablePullRequest>;

// Every pass, including startup and rule changes, looks up live threads only.
async function load(threads: ProjectThread[], row: (environmentId: string) => Row | Promise<Row>) {
  const batches: string[][] = [];
  let failLookup = false;
  let failList = false;
  const callRpc = pullRequestStatus(row, batches);
  const { bb, harness } = createFakePluginHost({
    pluginId: "bb-thread-inbox",
    sdk: {
      projects: {
        list: async () => {
          if (failList) throw new Error("projects unavailable");
          return projectsWith(threads);
        },
      },
      plugins: {
        callRpc: async (input) => {
          if (failLookup) {
            failLookup = false;
            batches.push(["failed"]);
            throw new Error("PR Status unavailable");
          }
          return callRpc(input);
        },
      },
    },
  });
  await plugin(bb);
  disposers.push(() => harness.lifecycle.dispose());
  const evaluate = () => harness.behavior.callRpc("evaluateAutoSettle", {}) as Promise<{ changedThreadIds: string[] }>;
  const settledIds = async () =>
    ((await harness.behavior.callRpc("listLifecycle", {})) as LifecycleListResult).rows
      .filter((lifecycle) => lifecycle.settledAt !== null)
      .map((lifecycle) => lifecycle.threadId);
  const changeRules = async (autoSettleAfterDays: number) => {
    const settings = (await harness.behavior.callRpc("getSidebarSettings", {})) as Record<string, unknown>;
    await harness.behavior.callRpc("updateSidebarSettings", { ...settings, autoSettleAfterDays });
  };
  return {
    batches,
    bb,
    changeRules,
    evaluate,
    failNextLookup: () => {
      failLookup = true;
    },
    failLists: (fail: boolean) => {
      failList = fail;
    },
    settledIds,
  };
}

describe("automatic settle leaves settled threads alone", () => {
  it("looks up only live threads on an ordinary pass, even in a shared workspace", async () => {
    let state: "merged" | "open" = "merged";
    const threads = [
      projectThread({ id: "settled_shared", environmentId: "env_shared", ...quiet }),
      projectThread({ id: "live_shared", environmentId: "env_shared", ...quiet, updatedAt: Date.now() }),
      projectThread({ id: "settled_solo", environmentId: "env_solo", ...quiet }),
    ];
    const policy = await load(threads, () => availablePullRequest(state, new Date(old).toISOString()));
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["settled_shared", "settled_solo"] });
    expect(policy.batches).toEqual([["env_shared", "env_solo"]]);

    // An open PR would return both settled threads under a full re-check.
    state = "open";
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: [] });
    // The shared workspace is still read for its live thread, but that row
    // does not decide the settled thread beside it.
    expect(policy.batches).toEqual([["env_shared", "env_solo"], ["env_shared"]]);
    await expect(policy.settledIds()).resolves.toEqual(["settled_shared", "settled_solo"]);
  });

  it("settles a quiet parent over a settled child whose PR reopened", async () => {
    let state: "merged" | "open" = "merged";
    const threads = [
      projectThread({ id: "parent", ...quiet, pinnedAt: 1 }),
      projectThread({ id: "child", parentThreadId: "parent", environmentId: "env_child", ...quiet }),
    ];
    const policy = await load(threads, () => availablePullRequest(state, new Date(old).toISOString()));
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["child"] });
    threads[0]!.pinnedAt = null;
    state = "open";
    // The settled child is not looked up again, so the whole tree counts as settled.
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["parent"] });
    expect(policy.batches).toEqual([["env_child"]]);
    await expect(policy.settledIds()).resolves.toEqual(["child", "parent"]);
  });

  it.each([
    ["pinned", { pinnedAt: 1 }],
    ["working", { status: "active" as const }],
    ["waiting on a question", { hasPendingInteraction: true }],
    ["holding queued work", { queuedWork: "waiting" as const }],
  ])("returns a settled thread that is %s without a lookup", async (_, change) => {
    const threads = [projectThread({ id: "thr", environmentId: "env_thr", ...quiet })];
    const policy = await load(threads, () => ({ outcome: "absent" }));
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["thr"] });
    Object.assign(threads[0]!, change);
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["thr"] });
    await expect(policy.settledIds()).resolves.toEqual([]);
    expect(policy.batches).toEqual([["env_thr"]]);
  });

  it("keeps pre-existing policy rows settled on the first pass", async () => {
    const policy = await load([projectThread({ id: "thr", environmentId: "env_thr", ...quiet })], () =>
      availablePullRequest("open"),
    );
    policy.bb.storage
      .database()
      .prepare(`INSERT INTO thread_lifecycle (thread_id, settled_at, settled_override) VALUES (?, ?, NULL)`)
      .run("thr", old + 1000);
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: [] });
    expect(policy.batches).toEqual([]);
    await policy.changeRules(90);
    await policy.evaluate();
    expect(policy.batches).toEqual([]);
    await expect(policy.settledIds()).resolves.toEqual(["thr"]);
  });

  it("retries failed lookups only while a thread is live", async () => {
    const policy = await load([projectThread({ id: "thr", environmentId: "env_thr", ...quiet })], () => ({
      outcome: "absent",
    }));
    policy.failNextLookup();
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: [] });
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["thr"] });
    await policy.evaluate();
    expect(policy.batches).toEqual([["failed"], ["env_thr"]]);
  });

  it("retries a failed live thread listing", async () => {
    const policy = await load([projectThread({ id: "thr", ...quiet })], () => ({ outcome: "absent" }));
    policy.failLists(true);
    await expect(policy.evaluate()).rejects.toThrow("projects unavailable");
    policy.failLists(false);
    await expect(policy.evaluate()).resolves.toEqual({ changedThreadIds: ["thr"] });
  });
});
