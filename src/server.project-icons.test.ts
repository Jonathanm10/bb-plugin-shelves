import { describe, expect, it } from "vitest";
import plugin from "./server";
import { createFakePluginHost, disposers, standardProject } from "./test-server";

describe("project icons", () => {
  it("serves an automatically discovered favicon through the local route", async () => {
    const project = standardProject();
    const { bb, harness } = createFakePluginHost({
      pluginId: "bb-sidebar-clean",
      sdk: {
        projects: {
          get: async () => project,
          fileContent: async ({ path }) => {
            if (path !== "favicon.svg") throw new Error("not found");
            return {
              content: '<svg xmlns="http://www.w3.org/2000/svg"/>',
              contentEncoding: "utf8" as const,
              mimeType: "image/svg+xml",
              sizeBytes: 46,
            };
          },
        },
      },
    });
    await plugin(bb);
    disposers.push(() => harness.lifecycle.dispose());

    const [response, concurrentResponse] = await Promise.all([
      harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1"),
      harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1"),
    ]);
    expect(response.status).toBe(200);
    expect(concurrentResponse.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    await expect(response.text()).resolves.toContain("<svg");
    expect(harness.inspection.sdk.callsTo("projects.fileContent")).toEqual([
      [{ projectId: "proj_1", hostId: "host_1", path: "package.json" }],
      [{ projectId: "proj_1", hostId: "host_1", path: "favicon.svg" }],
    ]);
  });

  it("finds icons outside the conventional paths through project file search", async () => {
    const project = standardProject();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const { bb, harness } = createFakePluginHost({
      pluginId: "bb-sidebar-clean",
      sdk: {
        projects: {
          get: async () => project,
          files: async ({ query }) => ({
            files:
              query === "icon"
                ? [
                    { name: "favicon.svg", path: "node_modules/pkg/favicon.svg" },
                    { name: "icon-picker.png", path: "docs/icon-picker.png" },
                    { name: "favicon.ico", path: "apps/frontend/src/assets/img/favicon.ico" },
                  ]
                : [{ name: "logo.svg", path: "app/frontend/public/pictures/logo.svg" }],
            truncated: false,
          }),
          fileContent: async ({ path }) => {
            if (path !== "apps/frontend/src/assets/img/favicon.ico") throw new Error("not found");
            return { content: svg, contentEncoding: "utf8" as const, mimeType: "image/x-icon", sizeBytes: 46 };
          },
        },
      },
    });
    await plugin(bb);
    disposers.push(() => harness.lifecycle.dispose());

    const response = await harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/x-icon");
    expect(harness.inspection.sdk.callsTo("projects.files")).toEqual([
      [{ projectId: "proj_1", hostId: "host_1", query: "icon", limit: "100" }],
      [{ projectId: "proj_1", hostId: "host_1", query: "logo", limit: "100" }],
    ]);
    const reads = harness.inspection.sdk
      .callsTo("projects.fileContent")
      .map(([args]) => (args as { path: string }).path);
    expect(reads.at(-1)).toBe("apps/frontend/src/assets/img/favicon.ico");
    expect(reads).not.toContain("node_modules/pkg/favicon.svg");
    expect(reads).not.toContain("docs/icon-picker.png");
  });

  it("prefers the image declared in package.json bb.branding", async () => {
    const project = standardProject();
    const { bb, harness } = createFakePluginHost({
      pluginId: "bb-sidebar-clean",
      sdk: {
        projects: {
          get: async () => project,
          fileContent: async ({ path }) => {
            if (path === "package.json") {
              const content = JSON.stringify({ bb: { branding: { icon: "brand/mark.png" } } });
              return { content, contentEncoding: "utf8" as const, mimeType: "application/json", sizeBytes: 40 };
            }
            if (path === "brand/mark.png" || path === "favicon.svg") {
              return { content: path, contentEncoding: "utf8" as const, mimeType: "image/png", sizeBytes: 10 };
            }
            throw new Error("not found");
          },
        },
      },
    });
    await plugin(bb);
    disposers.push(() => harness.lifecycle.dispose());

    const response = await harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1");
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("brand/mark.png");
  });

  it("keeps a missing icon a miss when the search finds nothing", async () => {
    const project = standardProject();
    const { bb, harness } = createFakePluginHost({
      pluginId: "bb-sidebar-clean",
      sdk: {
        projects: {
          get: async () => project,
          files: async () => ({ files: [], truncated: false }),
          fileContent: async () => {
            throw new Error("not found");
          },
        },
      },
    });
    await plugin(bb);
    disposers.push(() => harness.lifecycle.dispose());

    const response = await harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1");
    expect(response.status).toBe(404);
    // The app waits an hour before asking again only when the 404 carries this mark.
    expect(response.headers.get("x-bb-sidebar-icon-missing")).toBe("1");
  });

  it("does not cache a failed icon read as a missing icon", async () => {
    const project = standardProject();
    let hostReady = false;
    const { bb, harness } = createFakePluginHost({
      pluginId: "bb-sidebar-clean",
      sdk: {
        projects: {
          get: async () => project,
          fileContent: async ({ path }) => {
            if (!hostReady) throw new Error("Host host_1 is not connected");
            if (path !== "icon.svg") throw new Error("not found");
            return {
              content: '<svg xmlns="http://www.w3.org/2000/svg"/>',
              contentEncoding: "utf8" as const,
              mimeType: "image/svg+xml",
              sizeBytes: 46,
            };
          },
        },
      },
    });
    await plugin(bb);
    disposers.push(() => harness.lifecycle.dispose());

    const failed = await harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1");
    expect(failed.status).toBe(503);
    expect(failed.headers.get("cache-control")).toBe("no-store");
    expect(failed.headers.get("x-bb-sidebar-icon-missing")).toBeNull();

    hostReady = true;
    const recovered = await harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1");
    expect(recovered.status).toBe(200);
    await expect(recovered.text()).resolves.toContain("<svg");
  });
});
