/** Empty resource acknowledgement retained for installed clients. Filing never stops processes. */
interface ReclaimSummary {
  closedTerminals: number;
  keptTerminals: number;
  stoppedRuntime: boolean;
}

export const EMPTY_RECLAIM: ReclaimSummary = {
  closedTerminals: 0,
  keptTerminals: 0,
  stoppedRuntime: false,
};

function terminalCount(count: number): string {
  return `${count} ${count === 1 ? "terminal" : "terminals"}`;
}

/**
 * The one-line reminder shown after settling. Undefined when there is nothing
 * to say, so the toast stays a bare confirmation rather than an empty clause.
 */
export function describeReclaim(summary: ReclaimSummary): string | undefined {
  const parts: string[] = [];
  if (summary.stoppedRuntime) parts.push("Agent session stopped");
  if (summary.closedTerminals > 0) {
    parts.push(`closed ${terminalCount(summary.closedTerminals)} nobody used`);
  }
  if (summary.keptTerminals > 0) {
    parts.push(`${terminalCount(summary.keptTerminals)} left running`);
  }
  return parts.length === 0 ? undefined : parts.join(" · ");
}
