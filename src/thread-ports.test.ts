import { expect, it, vi } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { createThreadPortActions } from "./thread-ports";

it("routes read-only serving checks to the workspace host and respects ownership", async () => {
  const call = vi.fn(async () => ({
    ports: [
      { environmentId: "env_a", port: 3000, source: "process", ownerThreadId: "thr_a" },
      { environmentId: "env_a", port: 3001, source: "process", ownerThreadId: "other" },
    ],
  }));
  const { bb, harness } = createFakePluginHost({ experimental_callHostRpc: call });
  try {
    const thread = {
      id: "thr_a",
      environmentId: "env_a",
      environmentPath: "/workspace/a",
      environmentHostId: "host_a",
    };
    const serving = await createThreadPortActions(bb).threadsServingPorts([thread], [thread]);
    expect([...serving]).toEqual(["thr_a"]);
    expect(harness.inspection.experimental_hostRpcCalls).toEqual([
      expect.objectContaining({
        hostId: "host_a",
        method: "scan",
        input: { roots: [{ environmentId: "env_a", path: "/workspace/a" }] },
      }),
    ]);
  } finally {
    await harness.lifecycle.dispose();
  }
});
