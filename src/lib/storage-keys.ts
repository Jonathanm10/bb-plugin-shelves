// Lower priorities are evicted first. Existing keys and versions are durable.
export const STORAGE_KEYS = {
  // Runtime start stamps for duration labels.
  workingSince: { key: "shelves:working-since:v1", evictionPriority: 10 },
  // Last RPC inbox order.
  inboxOrder: { key: "shelves:inbox-order-cache:v1", evictionPriority: 20 },
  // Last RPC lifecycle rows.
  lifecycle: { key: "shelves:lifecycle-cache:v1", evictionPriority: 30 },
  // Expanded child parent IDs.
  childExpansion: { key: "shelves:child-expansion:v1", evictionPriority: 40 },
  // Collapsed project IDs.
  projectCollapse: { key: "shelves:project-collapse:v1", evictionPriority: 50 },
  // Selected projects in this window's session storage; empty means all.
  projectScope: { key: "shelves:project-scope:v1", evictionPriority: 85 },
  // Project shortcuts saved on this device, in pin order.
  pinnedProjects: { key: "shelves:pinned-projects:v1", evictionPriority: 90 },
  // Project slots in the Active shelf's project view, on this device.
  projectOrder: { key: "shelves:project-order:v1", evictionPriority: 88 },
  environmentCollapse: { key: "shelves:environment-collapse:v1", evictionPriority: 55 },
  environmentGrouping: { key: "shelves:environment-grouping:v1", evictionPriority: 71 },
  // Whether a project with one Active thread still gets a header.
  singleThreadProjectGrouping: { key: "shelves:single-thread-project-grouping:v1", evictionPriority: 72 },
  // Shelf disclosure booleans.
  shelfExpansion: { key: "shelves:shelf-expansion:v1", evictionPriority: 60 },
  // Active shelf sort mode.
  activeSort: { key: "shelves:active-sort:v1", evictionPriority: 70 },
  // Last RPC sidebar settings.
  settings: { key: "shelves:settings-cache:v1", evictionPriority: 80 },
  // Read-only legacy project grouping migration.
  activeGrouping: { key: "shelves:active-grouping:v1", evictionPriority: 65 },
} as const;

export const PLUGIN_STORAGE_KEYS = Object.values(STORAGE_KEYS)
  .sort((a, b) => a.evictionPriority - b.evictionPriority)
  .map(({ key }) => key);
