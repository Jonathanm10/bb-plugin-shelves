# Scope review

Reviewed against the requested Working / Active / Settled sidebar, Snooze, and
native BB controls. Confidence measures how certain the recommendation is from
source and caller evidence; it is not a test coverage score. These are proposals
for maintainer review, not additional removals authorized by this PR.

P0 means urgent correctness, security, or data-loss risk. P1 means the next
cleanup priority. P2 means optional simplification. Sizes: S is up to half a day,
M is roughly one to two days, including verification.

## Findings

| Priority | Candidate | Confidence | Size | Evidence and recommendation |
| --- | --- | --- | --- | --- |
| P0 | No new P0 runtime defect established | Medium (70%) | - | This review traced feature ownership, background work, mutations, dependencies, and callers. It is not a full security audit or a guarantee that no critical bug exists. |
| P1 | Automatic title recovery | High (99%) | S | `src/auto-title.ts` subscribes to thread events, schedules recovery after 10 seconds, persists claims, and permits up to three paid title-service attempts. `src/server.ts` starts it unconditionally. Remove this worker and its regeneration menu/RPC; let BB own titles. Preserve the historical migration/table. |
| P1 | Project favicon discovery and legacy appearance layer | High (95%) | M | `src/server-project-icons.ts` reads project files, searches for icon candidates, and serves its own image route. `src/ProjectColors.tsx` and `src/server-project-colors.ts` maintain separate appearance rendering. Optional for a thread inbox. Prefer native project marks; removing it changes saved appearance, so make that an explicit decision and retain stored records. |
| P1 | Historical PR discovery beyond native PR Status | High (92%) | M | `src/thread-pull-requests.ts` scans completed thread events for PR URLs, caches states, and calls `gh` through `src/pr-host.ts`; `src/ThreadPullRequests.tsx` renders the results. This supplies a multi-PR history beyond the native current-branch status. Remove if that history is unwanted; keep `src/server-policy.ts` integration with native GitHub PR Status for automatic settling. |
| P1 | Reopened PR details stay stale | High (99%) | S | `src/thread-pull-requests.ts` caches both merged and closed PRs indefinitely. Closed PRs can reopen, so a previously closed PR can keep its old badge/details. If historical PR discovery is retained, refresh closed states rather than treating them as terminal. This finding concerns the history display; automatic settling reads native PR Status separately. |
| P2 | Parent assignment and custom recursive delete | High (90%) | M | `src/RowContextMenu.tsx`, `src/ParentThreadMenu.tsx`, and server `setThreadParent`/`deleteThread` handlers extend sidebar management beyond filing. Consider retaining child display and using native management entry points. Do not remove descendant busy/attention guards or recursive-delete confirmation while deletion remains available. |
| P2 | Inactive shelf | High (99%) | M | `src/SidebarLayoutSettings.tsx` can enable an extra shelf and inactivity threshold. It is off by default, but duplicates the role of the requested auto-settling policy. Remove its setting and rendering if three main sections are the intended permanent scope; define how saved enabled preferences behave first. |
| P2 | Multiple density/grouping/reordering modes | Medium (85%) | M | `src/SidebarLayoutSettings.tsx`, `src/ActiveSortPicker.tsx`, `src/drag-reorder.ts`, and `src/drag-reorder-geometry.ts` support full/compact variants and several order/group views. Active's recent-return order and a single card style would reduce code and testing substantially, but remove existing customization. Choose the modes to keep before changing persisted preferences. |

## Removed in this PR

Workspace port detection, Docker/process inspection, polling/cache, row glyphs,
port links and device selection, and the port-based auto-settle exemption are
removed. An otherwise inactive thread can settle while its development server
continues running. Filing never stops that server. Native reported running work,
queues, pins, questions, and descendant protections remain.

## Retain

- Database migrations, inherited fixture snapshots, and compatibility reads:
  these protect installed data. They are not unused just because the old UI is gone.
- Native status resolution, synchronization/reconnect handling, and lifecycle
  guards: these keep returned work and unanswered questions reachable.
- Snooze time parsing and wake behavior: part of the requested functionality.
- PR lookup for merge/close-based auto-settling: a requested feature. Removing
  optional PR history must not remove the native policy integration.
- Current SDK import boundaries and browser isolation checks: these catch real
  runtime mistakes and protect developer data during tests.

## Release and listing follow-up

This PR adds release automation and corrects the development version display.
Actual tag publication and BB Community submission remain separate steps after
merge. Before submission, validate a fresh Git install through BB's current
marketplace checks, including host-entry dependency placement and engine ranges.
See [marketplace submission](marketplace.md) and [release instructions](../AGENTS.md#tag-based-releases).
