import { describe, expect, it } from "vitest";
import plugin from "./server";
import { createFakePluginHost, disposers, standardProject } from "./test-server";

async function setup() {
  let connected = true;
  const { bb, harness } = createFakePluginHost({
    pluginId: "bb-thread-inbox",
    sdk: {
      projects: {
        get: async () => standardProject(),
        files: async () => ({ files: [], truncated: false }),
        fileContent: async () => {
          if (!connected) throw new Error("Host is not connected");
          return { content: "<svg/>", contentEncoding: "utf8" as const, mimeType: "image/svg+xml", sizeBytes: 6 };
        },
      },
    },
  });
  await plugin(bb);
  disposers.push(() => harness.lifecycle.dispose());
  const db = bb.storage.database();
  return {
    harness,
    db,
    connect: (value: boolean) => {
      connected = value;
    },
    fetch: () => harness.behavior.fetchHttp("GET", "/project-icon?projectId=proj_1"),
    savePath: (path: string) => db.prepare("INSERT INTO project_icons VALUES (?, ?, ?)").run("proj_1", path, 1),
  };
}

describe("saved project icons", () => {
  it("uses a monogram fallback without searching or reading an unconfigured project", async () => {
    const state = await setup();
    const response = await state.fetch();
    expect(response.status).toBe(404);
    expect(response.headers.get("x-bb-thread-inbox-icon-missing")).toBe("1");
    expect(state.harness.inspection.sdk.callsTo("projects.files")).toEqual([]);
    expect(state.harness.inspection.sdk.callsTo("projects.fileContent")).toEqual([]);
    expect(state.harness.inspection.sdk.callsTo("projects.get")).toEqual([]);
  });

  it("preserves an explicitly saved icon and coalesces concurrent requests", async () => {
    const state = await setup();
    state.savePath("assets/logo.svg");
    const responses = await Promise.all([state.fetch(), state.fetch()]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses[0]!.headers.get("content-security-policy")).toContain("sandbox");
    expect(state.harness.inspection.sdk.callsTo("projects.fileContent")).toEqual([
      [{ projectId: "proj_1", hostId: "host_1", path: "assets/logo.svg" }],
    ]);
    expect(state.harness.inspection.sdk.callsTo("projects.files")).toEqual([]);
  });

  it("does not turn a disconnected saved icon into a permanent miss", async () => {
    const state = await setup();
    state.savePath("assets/logo.svg");
    state.connect(false);
    expect((await state.fetch()).status).toBe(503);
    state.connect(true);
    const response = await state.fetch();
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("<svg/>");
  });

  it("rejects a saved traversal path without reading project files", async () => {
    const state = await setup();
    state.savePath("../private.svg");
    expect((await state.fetch()).status).toBe(404);
    expect(state.harness.inspection.sdk.callsTo("projects.fileContent")).toEqual([]);
  });

  it("keeps a previously uploaded image without host access", async () => {
    const state = await setup();
    state.db
      .prepare("INSERT INTO project_icon_uploads VALUES (?, ?, ?, ?, ?, ?)")
      .run("proj_1", "logo.svg", "image/svg+xml", Buffer.from("<svg/>").toString("base64"), 6, 1);
    const response = await state.fetch();
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("<svg/>");
    expect(state.harness.inspection.sdk.callsTo("projects.fileContent")).toEqual([]);
  });
});
