# BB Sidebar Clean - Core workflow

Status: Approved for implementation in this conversation, 2026-11-19.
Reference: the user's T3 screenshots and the official thread-sidebar guide at
`pingdotgg/t3code@470ca63499293f7f680f8ad2e77381a6752f1348`.
The earlier implementation inventory remains in Git history and on
`docs/sidebar-product-spec`; it is not the release acceptance contract.

## Ownership

BB owns search, project and thread creation, notification delivery and click
routing, links/splits, conversation rendering, and native thread operations.
The plugin owns row presentation, attention ordering, Snooze/Settle metadata,
and the automatic settlement policy. Reuse native entry points rather than
building another search index, project backend, or notification delivery service.

## Core surface

- Active contains results, errors, and requests for the user. Newly returned
  work rises to the top. Reading alone does not settle it.
- Working contains continuing work without an overriding request for attention.
  Its newest run appears first. It is collapsed by default on a new device;
  the selected thread remains reachable. Saved disclosure choices survive.
- Settled keeps filed conversations accessible, collapsed by default.
- Snoozed appears only when used, ordered by wake time. Pinning stays optional.
- Default rows use two readable lines: project/status above the thread title.
  Metadata belongs in hover details. Density never removes lifecycle actions.
- Snooze and Settle appear on hover or keyboard focus, with touch/menu access.
  Settled rows offer Un-settle; snoozed rows offer Wake. Actions never activate
  the underlying thread link. Successful filing offers Undo.
- Keep native Search and New thread available. Explain the native Project
  picker/New project path; only add shortcuts using supported host APIs.

## Lifecycle

- Completion, failure, and requests return eligible work from Working to Active
  without a refresh or switching the selected thread.
- Snooze postpones visibility until a chosen time without answering a question,
  archiving the conversation, or stopping its runtime. An existing unanswered
  question may be snoozed. New attention after the snooze wakes it early.
  Running/queued work remains protected; unsupported awaited-work semantics
  must not be guessed from an idle status.
- Manual Settle preserves busy-tree guards. Un-settle restores an explicit
  Active override until new activity resumes ordinary policy. Snooze/Settle
  are organization actions; automatic runtime/process cleanup is outside core.
- Automatic inactivity settlement defaults to seven days. Merged PRs settle
  when enabled; closed PRs qualify independently. Keep threads with a PR
  exempts known PR threads from inactivity, not eligible terminal-PR rules.
- Rule changes and restarts do not reopen already settled conversations.
  New activity/attention still wakes them. Unknown PR results preserve state.
- Keep pin protection because the reference guide and current T3 code disagree
  on it. Keep the conservative background-work guard supported by BB's signals.
- PR eligibility currently uses BB's available PR update and thread activity
  timestamps. Do not claim exact terminal-time/user-message parity.

## Notifications

Use BB's built-in completion, question, and error notifications with native
thread navigation and existing permission/level/focus controls. Enable normal
completion notifications for the trial while retaining user/thread overrides.
Do not send duplicate alerts from a second server notification pipeline.
A foreground toast is separate from a system banner and is optional unless
native delivery cannot meet the agreed click-to-thread behavior.

## Outside core

Inactive/Parked creation, color/icon editors, extra manual sort modes, worktree
grouping, port cleanup, custom continuation scheduling, and drag-sweep gestures
are deferred. Retain compatibility with existing lifecycle data and truthful
provider/child-attention signals. Do not delete inherited modules before their
dependencies are understood.

## Release acceptance

1. Readable rows expose Snooze/Settle through pointer, keyboard, and touch.
2. A running thread completes or needs input: it returns to the top of Active
   live; busy children and unknown states remain represented truthfully.
3. Snooze an idle result or existing question; the request remains unanswered,
   timer/Wake restores it, and later attention wakes it early. No runtime stop.
4. Manually Settle, Un-settle, and Undo without losing the conversation. Busy
   trees refuse unsafe filing. Rule changes/restart leave settled work filed.
5. Native search can find filed work; native project creation remains reachable.
6. Native notification settings include completion delivery and click routing;
   distinguish broadcast/source verification from an observed OS banner.
7. Reload/reconnect preserves settings/lifecycle and does not need a tab switch.
8. Light/dark/narrow layouts remain usable. Use disposable BB data for testing.

Checks: `npm run check`, focused Vitest regressions before each behavioral fix,
and isolated Playwright browser acceptance. Capture and inspect before/after
screenshots. Commit verified slices and update the existing review PR; do not
merge it as part of this task.
