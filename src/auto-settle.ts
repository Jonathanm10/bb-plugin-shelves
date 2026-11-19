import { canPark, rowParkSignals, type ThreadRowWork } from "./lifecycle";

export const MIN_AUTO_SETTLE_AFTER_DAYS = 1;
export const MAX_AUTO_SETTLE_AFTER_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1_000;

export type SettledOverride = "active" | "settled";

export interface AutoSettleLifecycleState {
  parkedAt?: number | null;
  settledAt: number | null;
  settledOverride: SettledOverride | null;
  snoozedUntil: number | null;
}

/** The fields of a bb project-thread row that the policy reads. */
export interface AutoSettleThread extends ThreadRowWork {
  createdAt: number;
  latestAttentionAt: number;
  pinnedAt: number | null;
  updatedAt: number;
}

export type AutoSettlePullRequest =
  | { outcome: "absent" }
  | { outcome: "unknown" }
  | {
      outcome: "available";
      state: "closed" | "draft" | "merged" | "open";
      updatedAt: string;
    };

interface AutoSettleSettings {
  afterDays: number | null;
  onMerge: boolean;
  keepPullRequests?: boolean;
}

type AutoSettleDecision = "keep" | "settle" | "unsettle";

// Live work, questions and pins stay visible until the user resolves them.
function cannotAutoSettle(lifecycle: AutoSettleLifecycleState | null, thread: AutoSettleThread): boolean {
  return (
    thread.pinnedAt !== null ||
    !canPark(rowParkSignals(thread)) ||
    lifecycle?.parkedAt != null ||
    lifecycle?.snoozedUntil != null
  );
}

/** Whether deciding this thread's policy state requires a PR lookup. */
export function autoSettleNeedsPullRequest(
  lifecycle: AutoSettleLifecycleState | null,
  thread: AutoSettleThread,
): boolean {
  return !isAutoSettled(lifecycle) && lifecycle?.settledOverride == null && !cannotAutoSettle(lifecycle, thread);
}

/** Settled by the policy itself, not by the user. */
export function isAutoSettled(lifecycle: AutoSettleLifecycleState | null): boolean {
  return lifecycle?.settledAt != null && lifecycle.settledOverride == null;
}

/**
 * An ordinary pass leaves a thread the policy settled alone. Only the checks
 * that need no PR lookup can return it to Active: anything that would keep a
 * live thread out of policy reach, such as a pin or running work.
 */
export function decideAutoSettledThread(
  lifecycle: AutoSettleLifecycleState | null,
  thread: AutoSettleThread,
): AutoSettleDecision {
  return cannotAutoSettle(lifecycle, thread) ||
    (lifecycle?.settledAt != null && thread.latestAttentionAt > lifecycle.settledAt)
    ? "unsettle"
    : "keep";
}

export function isValidAutoSettleAfterDays(days: number): boolean {
  return Number.isInteger(days) && days >= MIN_AUTO_SETTLE_AFTER_DAYS && days <= MAX_AUTO_SETTLE_AFTER_DAYS;
}

/** Invalid settings disable inactivity settling instead of hiding work. */
export function parseAutoSettleAfterDays(enabled: boolean, rawDays: string): number | null {
  if (!enabled) return null;
  const days = Number(rawDays);
  return isValidAutoSettleAfterDays(days) ? days : null;
}

/**
 * Resolve one automatic transition. Explicit user overrides are immutable
 * here; real thread activity clears them through the lifecycle event handler.
 */
export function decideAutoSettle({
  lifecycle,
  now,
  pullRequest,
  settings,
  thread,
}: {
  lifecycle: AutoSettleLifecycleState | null;
  now: number;
  pullRequest: AutoSettlePullRequest;
  settings: AutoSettleSettings;
  thread: AutoSettleThread;
}): AutoSettleDecision {
  if (lifecycle?.settledOverride != null) return "keep";

  if (isAutoSettled(lifecycle)) return decideAutoSettledThread(lifecycle, thread);
  if (cannotAutoSettle(lifecycle, thread)) return "keep";

  // A failed lookup is not evidence that no open PR exists. Keep the current
  // state until the next evaluation can make a safe decision.
  if (pullRequest.outcome === "unknown") return "keep";

  const activityAt = Math.max(thread.createdAt, thread.updatedAt, thread.latestAttentionAt);
  let shouldSettle = false;

  if (pullRequest.outcome === "available") {
    const terminal = pullRequest.state === "closed" || (settings.onMerge && pullRequest.state === "merged");
    if (terminal) {
      const pullRequestUpdatedAt = Date.parse(pullRequest.updatedAt);
      // A malformed terminal timestamp is not evidence that the PR finished
      // after the thread's last activity. Keep the current state until a
      // trustworthy response arrives rather than hiding active work.
      if (Number.isNaN(pullRequestUpdatedAt)) return "keep";
      shouldSettle = pullRequestUpdatedAt >= activityAt;
    }
  }

  if (!shouldSettle && settings.afterDays !== null) {
    const keepPullRequest = settings.keepPullRequests === true && pullRequest.outcome === "available";
    shouldSettle = !keepPullRequest && activityAt < now - settings.afterDays * DAY_MS;
  }

  return shouldSettle ? "settle" : "keep";
}
