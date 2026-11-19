// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderSlot } from "./test-slot";
import { inbox, sidebarSettings, defaultSidebarSettings, thread, listProps, loadInboxApp } from "./test-inbox";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());

await loadInboxApp();

describe("sidebar settings", () => {
  it("keeps project colors opt-in and ignores the removed archive preview settings", async () => {
    localStorage.setItem("bb-sidebar-clean:shelf-expansion:v1", JSON.stringify({ settled: true, archived: true }));
    let settings = { ...defaultSidebarSettings, archivedShelfEnabled: true };
    const rendered = renderSlot(inbox, listProps, {
      sidebarThreads: {
        status: "ready",
        projects: [{ id: "proj_1", name: "bb", isPersonal: false, href: "", settingsHref: "" }],
        threads: [
          thread({ id: "live", title: "Live work" }),
          thread({ id: "done", title: "Settled work" }),
          thread({ id: "old", title: "Old work", isArchived: true, archivedAt: 500 }),
        ],
      },
      rpc: {
        getSidebarSettings: () => settings,
        listLifecycle: () => ({ rows: [{ threadId: "done", settledAt: 200, snoozedUntil: null, snoozedAt: null }] }),
        getProjectColors: () => ({ colors: {} }),
      },
    });
    await screen.findByText("Live work");
    const settledShelf = await screen.findByRole("region", { name: "Settled" });
    await within(settledShelf).findByText("Settled work");
    expect(within(settledShelf).queryByRole("button", { name: "Archive thread" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Archived" })).toBeNull();
    expect(document.querySelector("[data-project-stripe]")).toBeNull();
    expect(rendered.rpcCalls.some((call) => call.method === "getProjectColors")).toBe(false);
    expect(screen.queryByRole("button", { name: "Archive all settled threads" })).toBeNull();
    settings = { ...settings, projectColorsEnabled: true };
    await rendered.experimental_invalidateRpc(["sidebar-settings"]);
    expect(screen.queryByText("Old work")).toBeNull();
    expect(within(settledShelf).queryByRole("button", { name: "Archive thread" })).toBeNull();
    await waitFor(() => expect(document.querySelector("[data-project-stripe]")).not.toBeNull());
    settings = { ...settings, projectColorsEnabled: false };
    await rendered.experimental_invalidateRpc(["sidebar-settings"]);
    await waitFor(() => expect(screen.queryByRole("region", { name: "Archived" })).toBeNull());
    expect(within(settledShelf).queryByRole("button", { name: "Archive thread" })).toBeNull();
    expect(within(settledShelf).getByText("Settled work")).toBeDefined();
    expect(document.querySelector("[data-project-stripe]")).toBeNull();
  });

  it("uses one continuous stripe for a project group and refreshes its custom color", async () => {
    localStorage.setItem("bb-sidebar-clean:active-sort:v1", "project");
    let colors = { proj_1: "#123456" };
    const rendered = renderSlot(inbox, listProps, {
      sidebarThreads: {
        status: "ready",
        projects: [{ id: "proj_1", name: "add_on", isPersonal: false, href: "", settingsHref: "" }],
        threads: [thread({ id: "a", title: "First" }), thread({ id: "b", title: "Second" })],
      },
      rpc: {
        getSidebarSettings: () => ({
          ...defaultSidebarSettings,
          projectColorsEnabled: true,
          inactiveThreadsEnabled: false,
        }),
        getProjectColors: () => ({ colors }),
        listLifecycle: () => ({ rows: [] }),
      },
    });
    const group = await screen.findByRole("region", { name: "add_on project" });
    await waitFor(() =>
      expect(
        (group.querySelector("[data-project-stripe]") as HTMLElement)?.style.getPropertyValue("--bb-sidebar-project"),
      ).toBe("#123456"),
    );
    expect(group.querySelectorAll("[data-project-stripe]")).toHaveLength(1);
    expect(within(group).getByRole("list").querySelector("[data-project-stripe]")).toBeNull();
    colors = { proj_1: "#fedcba" };
    await rendered.experimental_invalidateRpc(["project-colors"]);
    await waitFor(() =>
      expect(
        (group.querySelector("[data-project-stripe]") as HTMLElement).style.getPropertyValue("--bb-sidebar-project"),
      ).toBe("#fedcba"),
    );
    fireEvent.click(within(group).getByRole("button", { name: "add_on (2)" }));
    expect(group.querySelectorAll("[data-project-stripe]")).toHaveLength(1);
  });

  it("limits stripes by display mode while keeping all project names colored", async () => {
    localStorage.setItem("bb-sidebar-clean:active-sort:v1", "project");
    localStorage.setItem("bb-sidebar-clean:single-thread-project-grouping:v1", "false");
    localStorage.setItem("bb-sidebar-clean:shelf-expansion:v1", JSON.stringify({ settled: true, archived: true }));
    let settings = {
      ...defaultSidebarSettings,
      projectColorsEnabled: true,
      inactiveThreadsEnabled: false,
      threadDisplay: "compact-working" as const,
      compactWorkingThreads: true,
    };
    const rendered = renderSlot(inbox, listProps, {
      sidebarThreads: {
        status: "ready",
        projects: ["group", "single", "busy", "settled"].map((id) => ({
          id,
          name: id,
          isPersonal: false,
          href: "",
          settingsHref: "",
        })),
        threads: [
          thread({ id: "a", projectId: "group", title: "First grouped" }),
          thread({ id: "b", projectId: "group", title: "Second grouped" }),
          thread({ id: "single", projectId: "single", title: "Full card" }),
          thread({
            id: "busy",
            projectId: "busy",
            title: "Compact card",
            indicator: "runtime",
            indicatorLabel: "Working",
          }),
          thread({ id: "settled", projectId: "settled", title: "Settled row" }),
        ],
      },
      rpc: {
        getSidebarSettings: () => settings,
        getProjectColors: () => ({ colors: {} }),
        listLifecycle: () => ({ rows: [{ threadId: "settled", settledAt: 200, snoozedUntil: null, snoozedAt: null }] }),
      },
    });
    const group = await screen.findByRole("region", { name: "group project" });
    await screen.findByText("Settled row");
    const assertColor = (element: Element, showStripe: boolean) => {
      expect(element.querySelectorAll("[data-project-stripe]")).toHaveLength(showStripe ? 1 : 0);
      expect(element.querySelector(".bb-sidebar-project-name")).not.toBeNull();
      expect(element.querySelector(".bb-sidebar-project-monogram")).not.toBeNull();
    };
    const row = (title: string) => screen.getByText(title).closest("li")!;
    await waitFor(() => expect(row("Compact card").querySelector(".h-8")).not.toBeNull());
    for (const display of ["all", "full", "grouped", "none"] as const) {
      settings = { ...settings, projectColorDisplay: display };
      await rendered.experimental_invalidateRpc(["sidebar-settings"]);
      await waitFor(() => {
        assertColor(group, display !== "none");
        assertColor(row("Full card"), display === "all" || display === "full");
        assertColor(row("Compact card"), display === "all");
        assertColor(row("Settled row"), display === "all");
      });
      expect(within(group).getByRole("list").querySelector("[data-project-stripe]")).toBeNull();
      fireEvent.click(within(group).getByRole("button", { name: "group (2)" }));
      assertColor(group, display === "all" || display === "grouped");
      fireEvent.click(within(group).getByRole("button", { name: "group (2)" }));
    }
    fireEvent.keyDown(screen.getByRole("button", { name: /Sort active threads/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("radio", { name: "Manual order" }), { detail: 1 });
    await waitFor(() => expect(screen.queryByRole("region", { name: "group project" })).toBeNull());
    expect(document.querySelector("[data-project-stripe]")).toBeNull();
    for (const title of ["First grouped", "Second grouped", "Full card", "Compact card", "Settled row"]) {
      assertColor(row(title), false);
    }
    settings = { ...settings, projectColorsEnabled: false };
    await rendered.experimental_invalidateRpc(["sidebar-settings"]);
    await waitFor(() => expect(document.querySelector(".bb-sidebar-project-name")).toBeNull());
    expect(document.querySelector("[data-project-stripe]")).toBeNull();
    expect(document.querySelector(".bb-sidebar-project-monogram")).toBeNull();
  });

  it("lists device hosts in settings and saves the local port-link choice", async () => {
    renderSlot(
      sidebarSettings,
      {},
      {
        sidebarThreads: {
          status: "ready",
          projects: [],
          threads: [thread({ host: { id: "host_local", name: "Local Mac" } })],
        },
        rpc: { getSidebarSettings: () => defaultSidebarSettings, listProjectIconSettings: () => ({ projects: [] }) },
      },
    );
    const select = await screen.findByLabelText("Open port links on");
    expect(within(select).getByRole("option", { name: "Local Mac" })).toBeDefined();
    fireEvent.change(select, { target: { value: "host_local" } });
    expect(localStorage.getItem("bb-sidebar-clean:port-link-host:v1")).toBe("host_local");
  });
  it("groups related controls and saves changes without a save button", async () => {
    let saved: typeof defaultSidebarSettings | null = null;
    renderSlot(
      sidebarSettings,
      {},
      {
        rpc: {
          getSidebarSettings: () => defaultSidebarSettings,
          updateSidebarSettings: (input) => {
            saved = { ...defaultSidebarSettings, ...(input as Partial<typeof defaultSidebarSettings>) };
            return saved;
          },
          listProjectIconSettings: () => ({
            projects: [
              {
                id: "proj_1",
                name: "Sidebar",
                customPath: null,
                customUploadName: null,
              },
            ],
          }),
        },
      },
    );

    expect((await screen.findAllByRole("heading", { level: 2 })).map((heading) => heading.textContent)).toEqual([
      "Thread behavior",
      "Sidebar",
      "Sidebar layout",
      "Child threads",
      "This device",
    ]);
    expect(screen.queryByRole("navigation", { name: "Settings sections" })).toBeNull();
    const layout = screen.getByRole("region", { name: "Sidebar layout" });
    expect(within(layout).queryByText("Experimental")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Sidebar" })).getByRole("switch", {
        name: "Working shelf",
      }),
    ).toBeDefined();
    expect(within(layout).queryByRole("switch", { name: "Archived shelf" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Project appearance" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Archiving" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive all settled threads" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.getByRole("switch", { name: "Inactive shelf" }).querySelector("span")?.className).toContain(
      "left-0.5",
    );
    expect(screen.getByRole("switch", { name: "Show children that need attention" }).getAttribute("aria-checked")).toBe(
      "true",
    );

    fireEvent.change(screen.getByLabelText("Snooze shortcuts"), {
      target: { value: "1h, Wait refresh=5h, Tonight=evening@20:00, Morning=tomorrow@08:30, Monday=next-week@10:00" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Show children that need attention" }));
    fireEvent.change(screen.getByLabelText("Child threads sort field"), {
      target: { value: "activity" },
    });
    fireEvent.change(screen.getByLabelText("Child threads sort direction"), {
      target: { value: "descending" },
    });
    fireEvent.change(screen.getByLabelText("Child thread icon"), {
      target: { value: "provider" },
    });
    await waitFor(() =>
      expect(saved).toEqual({
        ...defaultSidebarSettings,
        snoozePresets: "1h, Wait refresh=5h, Tonight=evening@20:00, Morning=tomorrow@08:30, Monday=next-week@10:00",
        showRunningChildrenWhenCollapsed: false,
        childSortField: "activity",
        childSortDirection: "descending",
        childIconStyle: "provider",
      }),
    ); // The section edited last says it saved; the others stay quiet.
    await waitFor(() =>
      expect(within(screen.getByRole("region", { name: "Child threads" })).getByRole("status").textContent).toBe(
        "Saved",
      ),
    );
    expect(within(screen.getByRole("region", { name: "Sidebar layout" })).getByRole("status").textContent).toBe("");
  });

  it("does not save invalid settings and previews valid snooze shortcuts", async () => {
    const saves: unknown[] = [];
    renderSlot(
      sidebarSettings,
      {},
      {
        rpc: {
          getSidebarSettings: () => defaultSidebarSettings,
          updateSidebarSettings: (input) => {
            saves.push(input);
            return { ...defaultSidebarSettings, ...(input as Partial<typeof defaultSidebarSettings>) };
          },
          listProjectIconSettings: () => ({ projects: [] }),
        },
      },
    );
    const preview = () =>
      within(screen.getByRole("list", { name: "Snooze menu preview" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent);

    const snoozeInput = await screen.findByLabelText("Snooze shortcuts");
    vi.useFakeTimers();
    fireEvent.change(snoozeInput, { target: { value: "later" } });
    expect(snoozeInput.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByText(
        "Use comma-separated durations or calendar times, such as 1h, Wait refresh=5h, evening@18:00, tomorrow@09:00, or next-week@09:00.",
      ),
    ).toBeDefined();

    fireEvent.change(snoozeInput, {
      target: { value: "15m, Lunch=3h" },
    });
    expect(preview()).toEqual(["15 minutes", "Lunch"]);

    fireEvent.change(snoozeInput, { target: { value: "tomorrow@25:00" } });
    expect(snoozeInput.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(snoozeInput, { target: { value: "Morning=tomorrow@08:30" } });
    expect(preview()).toEqual(["Morning"]);

    const inactiveHours = screen.getByLabelText("Hours before inactive");
    fireEvent.change(inactiveHours, { target: { value: "0" } });
    expect(inactiveHours.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter a whole number from 1 to 720.")).toBeDefined();
    // Past the save delay, nothing invalid has been sent.
    await act(async () => vi.advanceTimersByTimeAsync(700));
    expect(saves).toEqual([]);

    // Turning the rule off hides the value it no longer uses.
    fireEvent.click(screen.getByRole("switch", { name: "Inactive shelf" }));
    expect(screen.queryByLabelText("Hours before inactive")).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({
      inactiveThreadsEnabled: false,
      inactiveAfterHours: defaultSidebarSettings.inactiveAfterHours,
      snoozePresets: "Morning=tomorrow@08:30",
    });
  });

  it("keeps a settings cache written before the child-thread settings", () => {
    const previous: Record<string, unknown> = {
      ...defaultSidebarSettings,
      inactiveAfterHours: 12,
    };
    delete previous.childSortField;
    delete previous.childSortDirection;
    delete previous.childIconStyle;
    delete previous.projectColorDisplay;
    previous.projectColorsEnabled = true;
    window.localStorage.setItem("bb-sidebar-clean:settings-cache:v1", JSON.stringify(previous));
    renderSlot(
      sidebarSettings,
      {},
      {
        rpc: {
          getSidebarSettings: () => new Promise(() => {}),
          listProjectIconSettings: () => ({ projects: [] }),
        },
      },
    );

    expect(screen.queryByText("Loading settings...")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Show project stripes in" })).toBeNull();
    expect((screen.getByLabelText("Hours before inactive") as HTMLInputElement).value).toBe("12");
    expect((screen.getByLabelText("Child threads sort field") as HTMLSelectElement).value).toBe("created");
    expect((screen.getByLabelText("Child thread icon") as HTMLSelectElement).value).toBe("disc");
  });

  it("preserves unsaved settings when a realtime refresh arrives", async () => {
    let remoteSettings = defaultSidebarSettings;
    const rendered = renderSlot(
      sidebarSettings,
      {},
      {
        rpc: {
          getSidebarSettings: () => remoteSettings,
          listProjectIconSettings: () => ({ projects: [] }),
        },
      },
    );

    const shortcuts = await screen.findByLabelText("Snooze shortcuts");
    fireEvent.change(shortcuts, { target: { value: "Local=45m" } });
    remoteSettings = { ...defaultSidebarSettings, inactiveAfterHours: 12 };

    await rendered.emitRealtime("sidebar-settings", {});

    expect((shortcuts as HTMLInputElement).value).toBe("Local=45m");
  });
});
