// Lower priorities are evicted first. Existing keys and versions are durable.
export const STORAGE_KEYS = {
  // Runtime start stamps for duration labels.
  workingSince: { key: "bb-sidebar-clean:working-since:v1", evictionPriority: 10 },
  // Last RPC inbox order.
  inboxOrder: { key: "bb-sidebar-clean:inbox-order-cache:v1", evictionPriority: 20 },
  // Last RPC lifecycle rows.
  lifecycle: { key: "bb-sidebar-clean:lifecycle-cache:v1", evictionPriority: 30 },
  // Expanded child parent IDs.
  childExpansion: { key: "bb-sidebar-clean:child-expansion:v1", evictionPriority: 40 },
  // Collapsed project IDs.
  projectCollapse: { key: "bb-sidebar-clean:project-collapse:v1", evictionPriority: 50 },
  // Selected projects in this window's session storage; empty means all.
  projectScope: { key: "bb-sidebar-clean:project-scope:v1", evictionPriority: 85 },
  // Project shortcuts saved on this device, in pin order.
  pinnedProjects: { key: "bb-sidebar-clean:pinned-projects:v1", evictionPriority: 90 },
  // Project slots in the Active shelf's project view, on this device.
  projectOrder: { key: "bb-sidebar-clean:project-order:v1", evictionPriority: 88 },
  environmentCollapse: { key: "bb-sidebar-clean:environment-collapse:v1", evictionPriority: 55 },
  environmentGrouping: { key: "bb-sidebar-clean:environment-grouping:v1", evictionPriority: 71 },
  // Whether a project with one Active thread still gets a header.
  singleThreadProjectGrouping: { key: "bb-sidebar-clean:single-thread-project-grouping:v1", evictionPriority: 72 },
  // Shelf disclosure booleans.
  shelfExpansion: { key: "bb-sidebar-clean:shelf-expansion:v1", evictionPriority: 60 },
  // Active shelf sort mode.
  activeSort: { key: "bb-sidebar-clean:active-sort:v1", evictionPriority: 70 },
  // Last RPC sidebar settings.
  settings: { key: "bb-sidebar-clean:settings-cache:v1", evictionPriority: 80 },
  // Read-only legacy project grouping migration.
  activeGrouping: { key: "bb-sidebar-clean:active-grouping:v1", evictionPriority: 65 },
} as const;

export const PLUGIN_STORAGE_KEYS = Object.values(STORAGE_KEYS)
  .sort((a, b) => a.evictionPriority - b.evictionPriority)
  .map(({ key }) => key);
