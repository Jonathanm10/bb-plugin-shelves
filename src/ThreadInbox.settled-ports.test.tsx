// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk";
import { renderSlot } from "./test-slot";
import {
  defaultSidebarSettings,
  inbox,
  listProps,
  loadInboxApp,
  SETTLED_NOTHING,
  thread,
  toastMocks,
} from "./test-inbox";
import { LIFECYCLE_TAG } from "./rpc-tags";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());

await loadInboxApp();

const environment = (id: string): PluginSidebarThread["environment"] => ({
  id,
  name: null,
  branchName: "main",
  workspaceDisplayKind: "other",
  path: null,
  isWorktree: null,
  providerId: null,
});
const settledRow = { threadId: "settled", settledAt: 200, snoozedUntil: null, snoozedAt: null };
const PLUG = "Open ports started by this thread";

type Row = typeof settledRow;

function mount({
  open: openIds = ["env_settled"],
  rows: initialRows = [settledRow],
  extra = [],
  owner,
}: {
  open?: string[];
  rows?: Row[];
  extra?: PluginSidebarThread[];
  owner?: string;
} = {}) {
  let rows = initialRows;
  const open = new Set(openIds);
  // A workspace's port belongs to `owner`, or to the thread named after it: env_settled's to "settled".
  const getOpenPorts = vi.fn((input: unknown) => ({
    groups: (input as { environmentIds: string[] }).environmentIds
      .filter((id) => open.has(id))
      .map((environmentId) => ({
        environmentId,
        ports: [
          {
            port: 3000,
            processName: "node",
            pid: 1234,
            source: "process" as const,
            ownerThreadId: owner ?? environmentId.slice("env_".length),
          },
        ],
      })),
  }));
  const slot = renderSlot(inbox, listProps, {
    sidebarThreads: {
      status: "ready",
      threads: [
        thread({ id: "live", title: "Live work", environment: environment("env_live") }),
        thread({ id: "settled", title: "Settled work", environment: environment("env_settled") }),
        ...extra,
      ],
      projects: [],
    },
    rpc: {
      getSidebarSettings: () => ({ ...defaultSidebarSettings, inactiveThreadsEnabled: false }),
      listLifecycle: () => ({ rows }),
      getThreadExecutionDetails: () => null,
      getOpenPorts,
      settle: (input: unknown) => {
        rows = [...rows, { ...settledRow, threadId: (input as { threadId: string }).threadId }];
        return { ok: true, reclaim: SETTLED_NOTHING };
      },
    },
  });
  const scans = () => getOpenPorts.mock.calls.map(([input]) => (input as { environmentIds: string[] }).environmentIds);
  return {
    slot,
    scans,
    scansOf: (environmentId: string) => scans().filter((ids) => ids.includes(environmentId)).length,
    unsettle: () => {
      rows = [];
    },
  };
}

const plugOf = (shelf: HTMLElement, title: string) =>
  within(within(shelf).getByRole("link", { name: title, hidden: true }).closest("li")!).queryByRole("img", {
    name: PLUG,
    hidden: true,
  });
const pause = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

async function settledRowLink() {
  const settled = await screen.findByRole("region", { name: "Settled" });
  fireEvent.click(within(settled).getByRole("button", { name: /^Settled/ }));
  return { settled, row: await within(settled).findByRole("link", { name: "Settled work" }) };
}

describe("open ports of settled threads", () => {
  it("polls only live workspaces and scans a settled one once per card open", async () => {
    const { scans } = mount();
    const { settled, row } = await settledRowLink();
    await waitFor(() => expect(scans()).toEqual([["env_live"]]));
    expect(within(settled).queryByRole("img", { name: PLUG })).toBeNull();
    fireEvent.pointerMove(row, { pointerType: "mouse" });
    const details = await screen.findByRole("dialog", { name: "Thread details" });
    expect(await within(details).findByRole("button", { name: /Workspace ports \(1\)/ })).toBeDefined();
    expect(scans()).toEqual([["env_live"], ["env_settled"]]);
    expect(within(settled).getByRole("img", { name: PLUG })).toBeDefined();
    await act(async () => {});
    expect(scans()).toHaveLength(2);
  });

  it("adds a workspace to the poll when its thread returns to Active", async () => {
    const { slot, scans, unsettle } = mount();
    await settledRowLink();
    unsettle();
    await slot.behavior.experimental_invalidateRpc([LIFECYCLE_TAG]);
    await waitFor(() => expect(scans().at(-1)).toEqual(["env_live", "env_settled"]));
    const active = await screen.findByRole("region", { name: "Active" });
    expect(await within(active).findByRole("img", { name: PLUG })).toBeDefined();
  });

  it("settles a port-owning thread without prompting to stop its ports", async () => {
    const { slot } = mount({
      rows: [],
      extra: [thread({ id: "fresh", title: "Fresh work", environment: environment("env_fresh") })],
    });
    const row = (await screen.findByRole("link", { name: "Fresh work" })).closest("li")!;
    fireEvent.click(within(row).getByLabelText("Settle thread"));
    await waitFor(() => expect(toastMocks.success).toHaveBeenCalledWith("Thread settled", expect.anything()));
    await slot.behavior.experimental_invalidateRpc([LIFECYCLE_TAG]);
    expect(await screen.findByRole("region", { name: "Settled" })).toBeDefined();
    expect(toastMocks.message).not.toHaveBeenCalled();
    expect(
      slot.inspection.rpcCalls.some((call) => /cleanSettled|closeThreadPorts|stopWorkspacePort/.test(call.method)),
    ).toBe(false);
  });
});
