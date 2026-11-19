import { expect, it } from "vitest";
import { loadPlugin } from "./test-server";

it.each([
  ["getOpenPorts", { environmentIds: ["env_1"] }],
  ["regenerateTitle", { threadId: "thr_1" }],
  ["getThreadPullRequests", { threadId: "thr_1" }],
  ["getThreadLimits", { keys: [] }],
  ["scheduleLimitContinue", { threadId: "thr_1" }],
  ["cancelLimitContinue", { threadId: "thr_1", queuedMessageId: "queued_1" }],
  ["cleanSettled", { token: "98bb67b5-b58b-4fc4-9a55-34e557dc8f55" }],
  ["stopWorkspacePort", { threadId: "thr_1", port: { port: 3000, pid: 123 } }],
  ["setProjectColor", { projectId: "proj_1", color: "#123456" }],
  ["setProjectIcon", { projectId: "proj_1", path: "logo.svg" }],
  ["removeProject", { projectId: "proj_1", confirmation: "bb" }],
] as const)("does not expose the retired %s capability", async (method, input) => {
  const harness = await loadPlugin();
  await expect(harness.behavior.callRpc(method, input)).rejects.toThrow(`has no rpc method "${method}"`);
  expect(harness.inspection.sdk.callsTo("threads.stop")).toEqual([]);
  expect(harness.inspection.sdk.callsTo("terminals.close")).toEqual([]);
  expect(harness.inspection.sdk.callsTo("threads.queuedMessages.create")).toEqual([]);
});
