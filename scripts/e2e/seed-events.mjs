// Thread-log events that fail a scratch seed. Agent output (item/*) means the
// fixture ran a provider turn, and other provider events are errors. Two
// provider events are not: warnings, and notifications BB does not map
// (provider/unhandled), which newer Codex CLIs add over time. turn/* is allowed:
// an empty initial turn can start before `thread stop` arrives (e2e/README.md).
// An unmapped notification that reports agent activity (item/* or output
// deltas) still fails.
const TOLERATED_PROVIDER_EVENTS = new Set(["provider/warning", "provider/unhandled"]);
const agentActivity = (rawType = "") => rawType.startsWith("item/") || rawType.endsWith("/outputDelta");

export function unexpectedSeedEvents(events) {
  return events.filter(({ type, data }) => {
    if (type.startsWith("item/")) return true;
    if (type === "provider/unhandled" && agentActivity(data?.rawType)) return true;
    return type.startsWith("provider/") && !TOLERATED_PROVIDER_EVENTS.has(type);
  });
}
