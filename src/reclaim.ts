/**
 * Resource summaries for explicit cleanup and the legacy Park command.
 * Core Snooze and Settle only file threads and return EMPTY_RECLAIM for
 * compatibility with older clients. They never release resources implicitly.
 */

export interface ReclaimTerminal {
  id: string;
  lastUserInputAt: number | null;
  status: "disconnected" | "exited" | "running" | "starting";
}

interface TerminalReclaimPlan {
  /** Terminals settling may close, in the order they were listed. */
  close: string[];
  /** Live terminals settling refuses to touch, because someone typed in them. */
  keep: number;
}

export interface ReclaimSummary {
  closedTerminals: number;
  keptTerminals: number;
  stoppedRuntime: boolean;
}

export const EMPTY_RECLAIM: ReclaimSummary = {
  closedTerminals: 0,
  keptTerminals: 0,
  stoppedRuntime: false,
};

/**
 * A disconnected terminal's process may or may not still exist on the far side
 * of a dead daemon, so it is not counted as running. Claiming a number the
 * user cannot verify is worse than leaving it out of the reminder.
 */
function isLive(terminal: ReclaimTerminal): boolean {
  return terminal.status === "running" || terminal.status === "starting";
}

export function planTerminalReclaim(terminals: readonly ReclaimTerminal[]): TerminalReclaimPlan {
  const live = terminals.filter(isLive);
  const close = live.filter((terminal) => terminal.lastUserInputAt === null).map((terminal) => terminal.id);
  return { close, keep: live.length - close.length };
}

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
