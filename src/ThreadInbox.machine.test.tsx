// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import type { PluginSdkApp } from "@get-bb/plugin-sdk/app";
import { renderSlot } from "./test-slot";
import { inbox, defaultSidebarSettings, thread, listProps, render, loadInboxApp } from "./test-inbox";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());

await loadInboxApp();

const laptop = { id: "host_1", name: "Ada’s MacBook Pro" };
const server = { id: "host_2", name: "build-server" };
const projects = [{ id: "proj_1", name: "bb", isPersonal: false, href: "", settingsHref: "" }];
const row = (title: string | RegExp) => screen.getByRole("link", { name: title }).closest("li") as HTMLElement;
const machine = (title: string | RegExp) => row(title).querySelector<HTMLElement>("[data-thread-machine]");
const iconOf = (element: HTMLElement) => element.querySelector("[data-icon]")?.getAttribute("data-icon");

// T3 Code's card: project line, the title on its own line, then the machine
// leading a metadata line that ends in the provider glyph.
describe("machine on the card", () => {
  it("names the machine under the title, left of the card's metadata", async () => {
    render([
      thread({ id: "thr_a", title: "Laptop work", host: laptop }),
      thread({ id: "thr_b", title: "Server work", host: server }),
    ]);
    await screen.findByRole("link", { name: "Laptop work" });
    const onLaptop = machine("Laptop work")!;
    expect(onLaptop.textContent).toBe("Machine: Ada’s MacBook Pro");
    expect(machine("Server work")!.textContent).toBe("Machine: build-server");
    // The title spans the first row; the machine and then the metadata share the next.
    const title = onLaptop.previousElementSibling!;
    expect(title.textContent).toBe("Laptop work");
    expect(title.className).toMatch(/\bcol-span-2\b/);
    expect(within(onLaptop.nextElementSibling as HTMLElement).getByLabelText("Codex")).toBeDefined();
    // The whole row stays one link target: the marker never takes the pointer.
    expect(onLaptop.className).not.toContain("pointer-events-auto");
  });

  it("shows on a single-machine sidebar too", async () => {
    render([thread({ id: "thr_a", title: "Laptop work", host: laptop })]);
    await screen.findByRole("link", { name: "Laptop work" });
    expect(machine("Laptop work")!.textContent).toBe("Machine: Ada’s MacBook Pro");
  });

  it("picks a laptop icon from the machine's name, a monitor otherwise", async () => {
    render([
      thread({ id: "thr_a", title: "Laptop work", host: laptop }),
      thread({ id: "thr_b", title: "Server work", host: server }),
    ]);
    await screen.findByRole("link", { name: "Laptop work" });
    expect(iconOf(machine("Laptop work")!)).toBe("Laptop");
    expect(iconOf(machine("Server work")!)).toBe("Computer");
  });

  it("keeps the title and metadata on one line for a thread without a machine", async () => {
    render([thread({ id: "thr_a", title: "No machine yet", host: null })]);
    await screen.findByRole("link", { name: "No machine yet" });
    expect(machine("No machine yet")).toBeNull();
    const glyph = within(row("No machine yet")).getByLabelText("Codex");
    expect(within(glyph.parentElement!.parentElement!).getByText("No machine yet")).toBeDefined();
  });

  // A new thread has no machine until bb resolves its environment. A title
  // that moved to another parent then would unmount the editor and save the draft.
  it("keeps an inline rename open when the thread's machine resolves", async () => {
    const rendered = render([thread({ id: "thr_a", title: "New thread", host: null })]);
    fireEvent.doubleClick(await screen.findByRole("link", { name: "New thread" }));
    const input = await screen.findByRole("textbox", { name: "Rename New thread" });
    fireEvent.change(input, { target: { value: "Half-typed" } });

    const runtime = (globalThis as typeof globalThis & { __bbPluginRuntime: { pluginSdkApp: PluginSdkApp } })
      .__bbPluginRuntime.pluginSdkApp;
    const useThreads = runtime.experimental_useSidebarThreads;
    const resolved = [thread({ id: "thr_a", title: "New thread", host: laptop })];
    // One stable snapshot, as the host returns: same thread, machine now known.
    let resolvedSnapshot: ReturnType<typeof useThreads> | undefined;
    const spy = vi.spyOn(runtime, "experimental_useSidebarThreads").mockImplementation((...args) => {
      const snapshot = useThreads(...args);
      resolvedSnapshot ??= { ...snapshot, threads: resolved };
      return resolvedSnapshot;
    });
    try {
      const Inbox = inbox.component;
      await act(async () => rendered.rerender(<Inbox {...listProps} />));
      expect(machine("New thread")!.textContent).toBe("Machine: Ada’s MacBook Pro");
      expect(screen.getByRole("textbox", { name: "Rename New thread" })).toBe(input);
      expect((input as HTMLInputElement).value).toBe("Half-typed");
      expect(rendered.sdkCalls.some((call) => call.method === "threads.update")).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("leads the metadata line of a card inside a project group", async () => {
    localStorage.setItem("bb-thread-inbox:active-sort:v1", "project");
    try {
      render([thread({ id: "thr_a", title: "Laptop work", host: laptop })]);
      await screen.findByRole("link", { name: "Laptop work" });
      const onLaptop = machine("Laptop work")!;
      expect(onLaptop.textContent).toBe("Machine: Ada’s MacBook Pro");
      expect(within(onLaptop.parentElement!).getByLabelText("Codex")).toBeDefined();
    } finally {
      localStorage.removeItem("bb-thread-inbox:active-sort:v1");
    }
  });

  it("stays off one-line rows: compact cards, snoozed and settled", async () => {
    renderSlot(inbox, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          thread({ id: "compact", title: "Compact work", host: laptop }),
          thread({ id: "snoozed", title: "Snoozed work", host: laptop }),
          thread({ id: "settled", title: "Settled work", host: server }),
        ],
        projects,
      },
      rpc: {
        getSidebarSettings: () => ({
          ...defaultSidebarSettings,
          inactiveThreadsEnabled: false,
          threadDisplay: "compact-all",
        }),
        listLifecycle: () => ({
          rows: [
            { threadId: "settled", settledAt: Date.now(), snoozedUntil: null, snoozedAt: null },
            { threadId: "snoozed", settledAt: null, snoozedUntil: Date.now() + 86_400_000, snoozedAt: Date.now() },
          ],
        }),
      },
    });
    await screen.findByRole("link", { name: /Compact work$/ });
    for (const name of ["Snoozed", "Settled"]) {
      const shelf = await screen.findByRole("region", { name });
      const toggle = within(shelf).queryByRole("button", { expanded: false });
      if (toggle) fireEvent.click(toggle);
      await within(shelf).findByRole("link", { name: new RegExp(`${name} work$`) });
    }
    expect(document.querySelector("[data-thread-machine]")).toBeNull();
    expect(screen.queryByText("Ada’s MacBook Pro")).toBeNull();
    expect(screen.queryByText("build-server")).toBeNull();
  });
});
