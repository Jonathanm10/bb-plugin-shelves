import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_createHostEntryHarness } from "@get-bb/plugin-sdk/testing/host";

const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const { promisify } = await import("node:util");
  return { ...actual, execFile: Object.assign(vi.fn(), { [promisify.custom]: mocks.run }) };
});
import entry from "./pr-host";

let harness: ReturnType<typeof experimental_createHostEntryHarness<typeof entry.contract, {}>>;
beforeEach(() => {
  mocks.run.mockReset();
  harness = experimental_createHostEntryHarness(entry);
});
afterEach(async () => {
  await harness.experimental_dispose();
});

describe("host pull request lookup", () => {
  it("reads each PR with gh and skips the ones it cannot see", async () => {
    mocks.run.mockImplementation(async (command: string, args: string[]) => {
      if (command !== "gh") throw new Error(`Unexpected command ${command}`);
      if (args[2]!.endsWith("/2")) throw new Error("Could not resolve to a PullRequest");
      return {
        stdout: JSON.stringify({
          number: 1,
          title: "Fix",
          state: "OPEN",
          isDraft: true,
          url: "https://github.com/new/r/pull/1",
        }),
      };
    });
    const result = await harness.experimental_call("pullRequests", {
      urls: ["https://github.com/o/r/pull/1", "https://github.com/o/r/pull/2"],
    });
    expect(result.pullRequests).toEqual([
      { url: "https://github.com/o/r/pull/1", number: 1, title: "Fix", state: "draft" },
    ]);
  });
});
