// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
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
    // The metadata line: machine first, growing; the provider glyph at its end.
    const line = onLaptop.parentElement!;
    expect(line.firstElementChild).toBe(onLaptop);
    expect(onLaptop.className).toMatch(/\bflex-1\b/);
    expect(within(line).getByLabelText("Codex")).toBeDefined();
    // The title is the line above, not a neighbour on the metadata line.
    expect(within(line).queryByText("Laptop work")).toBeNull();
    expect(line.previousElementSibling?.textContent).toBe("Laptop work");
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
