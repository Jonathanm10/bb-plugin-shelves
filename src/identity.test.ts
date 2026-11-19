import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { BROWSER_EVENTS } from "./lib/browser-events";
import { PLUGIN_STORAGE_KEYS } from "./lib/storage-keys";
import { projectIconUrl } from "./project-icons";

it("uses the canonical package identity for installation", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  expect(manifest.name).toBe("bb-thread-inbox");
});

it("scopes project icons to the installed plugin's HTTP route", () => {
  expect(projectIconUrl("project", 1)).toBe(
    "/api/v1/plugins/bb-thread-inbox/http/project-icon?projectId=project&revision=1",
  );
});

it("isolates browser storage and events in the canonical plugin namespace", () => {
  for (const key of [...PLUGIN_STORAGE_KEYS, ...Object.values(BROWSER_EVENTS)]) {
    expect(key.startsWith("bb-thread-inbox:")).toBe(true);
  }
});
