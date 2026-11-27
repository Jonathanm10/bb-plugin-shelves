import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { BROWSER_EVENTS } from "./lib/browser-events";
import { PLUGIN_STORAGE_KEYS } from "./lib/storage-keys";
import { projectIconUrl } from "./project-icons";

it("uses the canonical package identity for installation", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  // BB drops the `bb-plugin-` prefix, so the installed plugin ID is `shelves`.
  expect(manifest.name).toBe("bb-plugin-shelves");
});

it("scopes project icons to the installed plugin's HTTP route", () => {
  expect(projectIconUrl("project", 1)).toBe("/api/v1/plugins/shelves/http/project-icon?projectId=project&revision=1");
});

it("isolates browser storage and events in the canonical plugin namespace", () => {
  for (const key of [...PLUGIN_STORAGE_KEYS, ...Object.values(BROWSER_EVENTS)]) {
    expect(key.startsWith("shelves:")).toBe(true);
  }
});
