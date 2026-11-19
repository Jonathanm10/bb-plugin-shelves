import type { PullRequestAttention, PullRequestState } from "./github-pr-status";

/**
 * A PR as the sidebar draws it. Only the live branch PR from GitHub PR Status
 * carries the attention state as well as the PR state.
 */
type DisplayPullRequest = {
  number: number;
  title: string | null;
  url: string;
  state: PullRequestState | null;
  attention?: PullRequestAttention;
};

export function pullRequestStatusLabel(pullRequest: DisplayPullRequest): string {
  switch (pullRequest.attention) {
    case "blocked":
      return "Blocked";
    case "changes_requested":
      return "Changes requested";
    case "checks_failed":
      return "Checks failed";
    case "checks_pending":
      return "Checks pending";
    case "conflicts":
      return "Conflicts";
    case "ready_to_merge":
      return "Ready to merge";
    case "queued":
      return "In merge queue";
    case "review_requested":
      return "Review requested";
    case "draft":
      return "Draft";
    case "merged":
      return "Merged";
    case "closed":
      return "Closed";
    // `none`, history entries without attention, and values newer than this
    // sidebar fall back to the state.
    default:
      if (!pullRequest.state) return "Status unavailable";
      return pullRequest.state[0]!.toUpperCase() + pullRequest.state.slice(1);
  }
}

export function pullRequestToneClass(pullRequest: DisplayPullRequest): string {
  if (pullRequest.state === "merged" || pullRequest.attention === "merged") {
    return "text-[color:var(--bb-thread-inbox-pr-merged)]";
  }
  if (
    pullRequest.attention === "blocked" ||
    pullRequest.attention === "changes_requested" ||
    pullRequest.attention === "checks_failed" ||
    pullRequest.attention === "conflicts"
  ) {
    return "text-[color:var(--bb-thread-inbox-pr-alert)]";
  }
  if (pullRequest.state === "draft" || pullRequest.attention === "draft") {
    return "text-muted-foreground/60";
  }
  if (pullRequest.state === "closed" || pullRequest.attention === "closed") {
    return "text-[color:var(--bb-thread-inbox-pr-alert)]";
  }
  if (pullRequest.state === "open") {
    return "text-[color:var(--bb-thread-inbox-pr-open)]";
  }
  return "text-muted-foreground";
}
