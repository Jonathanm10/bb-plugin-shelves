# BB Sidebar Clean - Product specification V1

Status: Proposed for review. This document becomes the product source of truth after approval.

Baseline: `52ab1f8` on `feature/t3-clean-sidebar`, inspected 2026-11-19.
Scope: Complete intended sidebar behavior, including existing advanced capabilities.
This specification does not authorize implementation changes or claim that every acceptance case has been verified at runtime.

## 1. Objective and product boundary

Help a person managing several BB conversations answer three questions:

- Which conversations need me?
- Which agents are still working?
- Where can I find finished work?

The everyday experience is a compact list with Active, Working, and Settled.
Pinned threads remain easy to reach. Completed results remain Active until deliberately filed or covered by an automatic rule.
Reading a result changes read state; it does not file the conversation.

T3 Code informs the attention model and automatic settling. BB's own activity signals, navigation, and plugin interfaces determine the adaptation.
This is a sidebar replacement, with supporting settings and thread-header integration.
BB owns application chrome, new-thread creation, the composer, conversation rendering, split routing, and global navigation.
The plugin owns project filtering, list presentation, hierarchy, saved sidebar order, lifecycle metadata, automatic policies, and its menus.
Use BB's bound actions for core operations where the integration already does so.

### Capability map

| ID | Responsibility | Depends on |
| --- | --- | --- |
| lifecycle | Activity signals, state precedence, transitions, automatic settling | BB thread data |
| presentation | Compact/full rows, status, metadata, hover details | lifecycle |
| discovery | Project scope, navigation, visible representatives | presentation |
| organization | Pins, ordering, menus, filing, Undo | lifecycle, discovery |
| hierarchy | Parent assignment, nested children, attention aggregation | lifecycle, discovery |
| recovery | Provider limits, ports, resource cleanup | lifecycle, hierarchy |
| preferences | Defaults, settings, persistence, failure recovery | Capability contracts above |

Validation order: lifecycle, presentation, discovery, organization, hierarchy, recovery, preferences.
This is a product capability map, not an implementation task plan.

### Priority and status vocabulary

- Core: Required for the default experience and release acceptance.
- Advanced: Existing supported behavior retained behind optional controls or contextual actions.
- Deferred: A possible follow-up, outside this version's acceptance criteria.
- Host-owned: BB behavior the extension integrates with; it is not reimplemented here.

The requirements below preserve the inspected product baseline. Section 12 lists unresolved additions and alternatives separately.

## 2. Defaults and information architecture

| Setting | New-install default |
| --- | --- |
| Thread display | Compact all threads |
| Working shelf | Enabled and expanded |
| Active and Pinned disclosure | Expanded |
| Settled disclosure | Collapsed |
| Active sort | Manual order, initially newest-created first |
| Auto-settle inactivity | Enabled after 7 days |
| Auto-settle merged PRs | Enabled |
| Keep threads with a PR | Disabled |
| Inactive shelf | Disabled |
| Dock shelves to bottom | Disabled |
| Keep pinned/woken threads full | Disabled |
| Compact project icon only | Disabled |
| Project colors | Disabled |
| Show children needing attention while collapsed | Enabled |
| Child sort | Creation time, oldest first |
| Child icon | Color circle |

Existing installations retain saved preferences and documented compatibility mappings.
The core layout orders Pinned, Active, Working, and Settled. Optional shelves appear between Working and Settled: Inactive, Snoozed, and Parked.
Empty optional shelves do not require permanent empty space. Active and Working have their own empty presentations.
Advanced settings retain alternate layouts and legacy shelves without adding Park or Snooze to compact-row menus.

Authority: [settings defaults](src/sidebar-settings-values.ts), [disclosure defaults](src/lib/inbox-preference-codecs.ts), [view](src/ThreadInboxView.tsx).

## 3. Lifecycle and attention - Core

### State definitions and precedence

- Active: Results, requests, failures, woken conversations, and other available conversations.
- Working: Unpinned thread trees with current work and no overriding request for attention.
- Settled: Quiet work filed manually or automatically; the conversation remains available.
- Pinned: A protected position for eligible live threads, separate from runtime status.
- Snoozed, Parked, and Inactive: Advanced organization described in section 9.

Runtime status and list section are separate concepts. A pinned agent can be working while remaining Pinned.
Classify a tree through its represented parent row, rather than duplicating children across shelves.
Archived threads are excluded from the inbox.

Resolve placement in this order:

1. Identify non-archived, scoped threads and their represented parent rows.
2. Apply lifecycle guards: live work, queued/failed sends, or pending interaction prevents filing out of live work.
3. Apply eligible Parked, Snoozed, or Settled state; pins override stale policy-settled state when no explicit settlement, park, or snooze remains.
4. Partition live rows into Pinned and unpinned work.
5. Keep attention-bearing trees and newly woken trees available in Active.
6. Move eligible working trees to Working when enabled; otherwise retain them in Active.
7. Apply the optional Inactive rule, then leave remaining rows Active.

The currently open row or represented ancestor remains visible through relevant collapse and pagination rules.
An explicit project filter may exclude it; filtering must not mutate lifecycle or order.

### Working and attention signals

- Native work includes an in-flight turn, workflow, background agent, background command, or plan-mode activity.
- Display classification uses BB's status resolver and each thread's own contributed row status.
- A request for input anywhere below a parent keeps its tree available in Active.
- Work completion, failure, or a request requiring the user returns eligible unpinned work from Working to Active.
- Turning Working off returns its rows to the live list without altering saved lifecycle state.
- A disconnected or unstarted thread must not acquire a Working display solely from stale running information.
- Server filing guards use shared native activity signals. Another plugin's running row status additionally blocks manual filing in the UI; that status is not available to server policy.

### Manual filing and return

- Settle checks the whole thread tree and rejects a busy or blocked member.
- Successful settling files the eligible tree, removes its pins, and attempts resource reclaim.
- New native work or attention makes settled work live again. Reading alone does not.
- Un-settle explicitly restores work; the automatic policy respects that override until real activity clears it.
- Manual state and policy-owned state remain distinguishable so automation cannot overwrite a current explicit choice.
- Explicitly filing the open thread navigates to a new-thread composer in its project after success.
- Automatic settling does not change the conversation the user is viewing.
- Rejected filing preserves placement and reports the reason using the displayed thread title.

### Automatic settling

- Evaluate on sidebar activation and on the five-minute BB server schedule; the browser may be closed while BB runs.
- Inactivity uses the latest of creation, update, and attention timestamps. Valid inactivity settings are whole days from 1 through 90.
- Closed PRs qualify independently of the merged-PR switch. Merged PRs qualify when that switch is on.
- A terminal PR qualifies only when its valid update timestamp is at least as recent as the thread's activity anchor.
- With Keep threads with a PR enabled, a known PR blocks inactivity settling; qualifying close/merge rules still apply.
- Pins, native live work, pending interaction, queued/failed sends, explicit overrides, Parked/Snoozed state, and live descendants protect work from automatic filing.
- An unavailable/failed PR lookup means unknown, not absent. Unknown data or an invalid terminal timestamp preserves the current policy state until a trustworthy evaluation.
- An ordinary pass skips PR rechecks for policy-settled threads. Local protection signals can return them to Active; startup and policy changes request a full recheck.
- Automatic settlement never archives or deletes a conversation.

BB adaptation: the current policy compares PR update time with thread activity, not T3's user-authored-message/PR-close model. Background commands conservatively count as live work; do not infer an ignorable dev server from missing semantic information.

Authority: [lifecycle](src/lifecycle.ts), [tree classification](src/working-tree.ts), [shelf partition](src/useInboxShelfThreads.ts), [manual actions](src/useLifecycle.ts), [automatic decision](src/auto-settle.ts), [server policy](src/server-policy.ts).

## 4. Row presentation and details - Core

- Compact all threads keeps normal rows on one line while retaining title, project cue, status, unread state, provider identity, and child disclosure.
- Full cards expose additional metadata. Compact working threads is an alternate mode that compacts working trees.
- Optional exceptions can keep pins and newly woken rows full. Woken emphasis ends when opened or dismissed.
- Use BB-resolved display titles, including mention names; edit the stored title so mention tokens survive renaming.
- Show a fallback title when no usable title exists. Unknown providers get a neutral glyph.
- Render attention, errors, queued/failed sends, runtime/monitoring, duration, and idle age according to BB signals and row-status precedence.
- A question outranks a failed-send label. Failed send outranks ordinary status; a waiting send labels otherwise quiet work.
- Reading idle work reduces emphasis; unread work retains its cue. Running work must not look complete merely because an earlier result is unread.
- Preserve the unsent-draft indicator on existing conversations. Standalone draft cards are not promised in this version.
- Show branch/worktree metadata where available, falling back to machine information when appropriate.
- Expose PRs, ports, and provider-limit details contextually without crowding the compact title.
- Hover/focus details include the full displayed title, project, machine, branch, model/effort, contributed status, subthreads, PRs, ports, and provider limit when available.
- Loading/unavailable detail values remain distinguishable from a known empty result.
- Inline actions and nested links must not trigger parent-row navigation.

Authority: [card](src/ThreadCard.tsx), [compact row](src/CompactRow.tsx), [status slot](src/StatusSlot.tsx), [metadata](src/ThreadMetadata.tsx), [details](src/ThreadDetailsTooltip.tsx).

## 5. Discovery and navigation - Core

- Project scope supports multiple selected projects; an empty selection means all projects.
- Search project names inside the picker. Keep it open while toggling choices, with keyboard selection and Escape dismissal.
- Apply scope to every shelf without changing pin state, lifecycle, or saved order.
- Retain scope within the window session; retain usable in-memory selection if storage is unavailable.
- Pinned project shortcuts toggle scope membership and support saved pointer/keyboard ordering.
- Thread rows, child rows, and hover-card subthreads use BB thread links. Let BB handle modifier-click splits and saved Full Screen behavior.
- Normal navigation closes the mobile drawer. Mark rows as BB shortcut targets and display the host's jump hints.
- Preserve a route back to a child's parent through the thread-header parent chip.
- Distinguish loading, disconnected/error, no threads, and an empty project scope. Do not briefly present cached parked work as Active while lifecycle data loads.
- Settled shows 10 rows initially and 25 more per expansion step; retain the open representative outside that slice.

Host-owned: New thread, application/global search, app navigation controls, and split routing. The extension currently provides no independent full-text thread search or standalone draft list. Neither is an implemented capability of this spec.

Authority: [scope controls](src/ProjectScopeControls.tsx), [project picker](src/ProjectScopeSelect.tsx), [navigation tests](src/ThreadInbox.navigation.test.tsx), [empty states](src/ThreadInboxEmptyStates.tsx), [shelves](src/ThreadInboxShelves.tsx).

## 6. Organization and actions - Core

- Preserve BB pin order. Only roots can be newly pinned; an existing pinned child retains Unpin so it can be corrected.
- Pinning a root clears conflicting shelf state through the lifecycle operation.
- Manual Active order is stable across ordinary activity, reading, and view switches. Newly encountered threads use the newest-created baseline.
- Alternate Active views are Recent activity, Waiting longest, Date created, and Project.
- Waiting longest sorts oldest attention first; reading or renaming does not restart its wait.
- Time-sorted views disable manual thread reordering. Returning to Manual restores saved order.
- Reorder with pointer or Alt+Up/Down. Save full relevant order, preserving hidden/project-filtered entries.
- A host update during drag is reconciled with the latest order; failed persistence restores the previous order and reports failure.
- Menus provide Open in split, Parent, parent-notification options when applicable, Project actions, eligible pin/lifecycle actions, Rename, Regenerate title, read/unread, Copy, Archive, and Delete.
- Copy includes BB's thread link, available branch, and thread ID.
- Rename supports menu entry, double-click, Enter save, blur save, and Escape cancel. Keep the edited row from jumping shelves mid-edit unless attention requires visibility.
- BB owns title generation. Prevent duplicate regeneration and report success, unchanged title, or failure without discarding the previous title on failure.
- Archive uses BB's tree action and respects its eligibility. Delete confirms the named thread, project, and deletion cascade before invoking deletion.
- If deletion removes the open conversation, open a new-thread composer in that project.
- Successful lifecycle operations expose contextual Undo. Settle Undo restores the captured lifecycle snapshot selectively; it does not recreate released runtimes, terminals, or pins.
- Undoing Wake restores the original absolute future wake time. An expired time is not rescheduled.
- Display success only after an operation succeeds; suppress duplicate in-flight mutations for the same thread.

Authority: [menus](src/RowContextMenu.tsx), [ordering](src/useInboxReorder.ts), [sort rules](src/inbox-layout.ts), [filing navigation](src/useShelveActions.ts), [Undo](src/useLifecycle.ts), [delete confirmation](src/DeleteThreadDialog.tsx).

## 7. Projects and hierarchy - Core with advanced controls

- A child appears under its visible parent, not twice in the flat list. A child whose parent is archived, deleted, or filtered out remains reachable as its own row.
- Support nested descendants with cycle guards; stop rollup through archived branches.
- Parent badges summarize child state; questions cannot disappear behind a parent classified only as Working.
- Expand/collapse children with persisted disclosure. With the default attention-retention preference, keep relevant children visible while collapsed.
- Keep the open descendant's represented ancestry visible through shelf, project, and worktree collapse.
- Child sort supports creation/activity and oldest/newest; hover-card subthreads follow the same preference.
- Child glyphs support color circles or provider icons. Provider badges deduplicate agents where specified by that mode.
- Parent selection is searchable, offers None, excludes unsafe/cyclic candidates, and prioritizes the same project's choices.
- Reparenting a pinned thread to another parent unpins it. Report a partial unpin failure explicitly.
- Parent-notification options load/save through their existing BB-backed integration and expose failures.
- Project mode groups projects with multiple Active threads, with an option to group single-thread projects too.
- Preserve project slots while work leaves and returns. Group collapse exposes counts and attention summaries.
- Optional worktree grouping nests environments by identity under projects; ordinary checkouts and singleton environments are not unnecessarily grouped.
- Keep Pinned flat. Reorder threads within their allowed group and whole groups within their parent scope.
- Optional project icon/color controls, project rename/path controls, thread project reassignment, and confirmed project removal remain supported.

Authority: [tree visibility](src/inbox.ts), [children](src/ChildThreadList.tsx), [parent menu](src/ParentThreadMenu.tsx), [project layout](src/inbox-layout.ts), [environment grouping](src/environment-groups.ts), [project actions](src/ProjectContextMenu.tsx), [project management](src/ProjectManagement.tsx).

## 8. Recovery and resource management - Advanced

- Provider-limit state identifies the affected thread and exposes known reset information.
- Support scheduling Continue, choosing a time when reset is unknown, viewing durable scheduled state, and cancellation.
- A scheduled Continue can keep its thread Snoozed until the scheduled send; unrelated or failed queued work must remain visible.
- Reconcile schedules changed by another client after reconnect; preserve error/cancel controls after failed actions.
- Port details identify workspace servers and distinguish ownership before offering destructive operations.
- Port-link host selection is device-specific. Keep long port lists accessible when a local link cannot be produced.
- Stopping a workspace port requires the existing second-press confirmation.
- After manual settling, offer to close owned ports; perform it only after confirmation and recheck affected workspaces.
- Clean Settled first previews eligible/skipped work and reasons. Confirmation is required; an empty preview offers no Clean execution.
- Keep failures visible, including after the last row leaves Settled. Protect shared or otherwise ineligible workspaces.
- Reclaim reports resources left running; Undo restores organization, not released resources.
- Recurring PR, rate-limit, and port work skips settled threads. Hovering/opening settled work requests on-demand details. A workspace shared with live work remains eligible for polling.

Authority: [limit recovery](src/RateLimitRecovery.tsx), [ports](src/OpenPorts.tsx), [settle port prompt](src/settled-port-prompt.ts), [clean preview](src/CleanSettledDialog.tsx), [cleanup](src/server-settle-cleanup.ts), [live-thread filter](src/live-threads.ts).

## 9. Advanced shelves and appearance

- Park is an explicit indefinite wait; Resume or new attention/work returns it. It has no wake timer.
- Snooze has a future wake time, early wake on BB attention/native work, and a durable Woke marker until acknowledged.
- Park/Snooze/Settle reject native work, queued/failed sends, and pending interaction. BB snooze therefore differs from T3's ability to hide some continuing work or existing questions.
- Configured snooze shortcuts accept durations and named calendar times, with validation and a preview. Custom date/time and palette commands use the same lifecycle guards.
- Snoozed sorts by soonest wake; Parked and Settled sort newest filing first.
- Inactive is an optional time-derived presentation of quiet unpinned work, separate from persistent settlement. New activity returns it to live presentation.
- Optional bottom docking keeps lower shelves docked when collapsed; expanded content participates in list scrolling.
- Full-card mode retains eligible legacy Park/Snooze affordances; compact mode retains the simpler everyday action set.
- Project colors can be enabled with scope controls for stripe placement; icons/names retain usable fallbacks.

Authority: [lifecycle](src/lifecycle.ts), [inactive](src/inactive.ts), [layout settings](src/SidebarLayoutSettings.tsx), [appearance settings](src/ProjectAppearanceSection.tsx), [snooze commands](src/lib/snooze-commands.ts).

## 10. Settings, persistence, and reliability - Core

- Present auto-settle controls first; collapse layout, child, device, appearance, and project-management controls under Advanced settings.
- Auto-save valid edits after the existing 500 ms debounce; show section-specific saving/saved/error feedback.
- Invalid values stay editable with an explanation and are not persisted. Save only edited fields so concurrent client changes survive.
- Server-owned: lifecycle rows, explicit overrides, inbox order, policy settings, and existing project metadata integrations.
- Device-owned: disclosure, Active view, project/worktree view choices/order, pinned-project shortcuts, working-duration cache, and port-link host.
- Window-session-owned: selected project scope. Cross-device synchronization is not promised for device/session preferences.
- Retain cached lifecycle/settings/order until authoritative answers arrive; reconnect and invalidation refresh them without stale reads undoing successful writes.
- Storage errors must not break the list. Validate cached values and use declared fallback/eviction behavior.
- Do not begin recurring live-thread work until lifecycle data is known. Batch workspace lookups and avoid background polling for the settled population.
- Support keyboard actions, visible focus, accessible action names and disclosure state, announced reorder feedback, touch scrolling, narrow widths, and reduced motion.
- Keep destructive cleanup/project removal separate from automatic filing, with concrete confirmation of the affected work.
- Retain the plugin's own database and storage namespace. Selecting another sidebar renderer does not stop this plugin's server jobs; disabling the plugin does.

Authority: [settings](src/SidebarSettings.tsx), [storage ownership](src/lib/storage-keys.ts), [cached reads](src/lib/cached-rpc-state.ts), [SDK boundary](src/bb-sdk.ts), [project instructions](AGENTS.md).

## 11. Acceptance and verification

These are release acceptance scenarios, not a claim that the draft itself implements new behavior.

| ID | Scenario | Required result | Existing evidence |
| --- | --- | --- | --- |
| A01 | Fresh install | Compact defaults, Working enabled, Settled collapsed, inactivity 7 days | `clean-defaults.test.ts`, `ThreadInbox.clean.test.tsx` |
| A02 | Work completes or needs input | Eligible tree returns from Working to Active; reading does not settle | `ThreadInbox.working-shelf.test.tsx`, `ThreadInbox.child-questions.test.tsx` |
| A03 | Pending/failed send or busy descendant | Manual/policy filing refuses; reason remains visible | `auto-settle.test.ts`, `server.settled-children.test.ts` |
| A04 | Old quiet thread, known PR outcome | Apply enabled inactivity/merge and independent close rules | `auto-settle-t3.test.ts`, `auto-settle.test.ts` |
| A05 | Unknown/malformed PR outcome | Preserve state; retry rather than infer completion | `auto-settle.test.ts` |
| A06 | New activity after settlement | Return to live work without changing the user's current conversation | `ThreadInbox.clean.test.tsx` |
| A07 | Explicitly settle open thread | Navigate to project composer; selective Undo restores captured lifecycle | `ThreadInbox.menu-navigation.test.tsx`, `ThreadInbox.menu-lifecycle.test.tsx` |
| A08 | Filter projects and reorder | Every shelf filters; hidden order survives; failure rolls back | `ThreadInbox.project-scope.test.tsx`, `ThreadInbox.inbox-order.test.tsx` |
| A09 | Modifier-click, mobile, host jump | BB routes splits; mobile drawer closes; hints remain usable | `ThreadInbox.navigation.test.tsx` |
| A10 | Collapse tree/group with active descendant | Open/attention-bearing representative stays reachable under specified retention rules | `ThreadInbox.hierarchy.test.tsx`, `ThreadInbox.environment-groups.test.tsx` |
| A11 | Rename/regenerate/delete | Preserve mention tokens; prevent duplicate regeneration; confirm named cascade | `ThreadInbox.menu-editing.test.tsx` |
| A12 | Restart/reconnect/storage unavailable | No false Active flash; persisted choices survive; controls stay usable | `ThreadInbox.loading.test.tsx`, `ThreadInbox.shelves.test.tsx`, `ThreadInbox.project-scope.test.tsx` |
| A13 | Schedule/cancel limited continuation | Durable schedule and correct shelf; failures remain actionable | `ThreadInbox.rate-limits.test.tsx` |
| A14 | Inspect settled ports or run Clean | On-demand lookup, explicit confirmation, protected/shared work retained | `ThreadInbox.settled-ports.test.tsx`, `ThreadInbox.clean-preview.test.tsx` |
| A15 | Another plugin contributes running status | Display and manual UI guards honor it; server limit stays explicit | `ThreadInbox.display-working.test.tsx` |
| A16 | Change settings during concurrent refresh | Valid edited fields persist; invalid edits are explained; newer values survive | `ThreadInbox.settings.test.tsx`, `server.settings.test.ts` |

Test paths above are under `src/`. Match pure rules with unit tests, server lifecycle/persistence with wired/database integration tests, and user flows/layout with scratch-server browser tests.
Browser acceptance includes compact/full layouts, narrow width, light/dark themes, keyboard controls, and reduced motion. Tests must use disposable BB data, not live conversations.

### Engineering reference

- Runtime floor: BB `>=0.49.0`, plugin SDK `>=0.6.132`; exact development pins are in [package.json](package.json).
- Source: TypeScript, React, BB plugin app/server/host entries; existing SQLite server persistence and validated RPC contracts.
- UI composition: `src/ThreadInboxView.tsx`, `src/ThreadInboxShelves.tsx`, `src/InboxThreadRenderer.tsx`; pure lifecycle/order rules: `src/lifecycle.ts`, `src/auto-settle.ts`, `src/inbox-layout.ts`.
- Naming/style: retain existing modules and typed contracts; for example, consume `DEFAULT_SIDEBAR_SETTINGS.workingShelf` instead of repeating a default literal. Follow [AGENTS.md](AGENTS.md) for runtime/import boundaries.
- Install dependencies: `npm ci`.
- Complete checks: `npm run check` (lint, formatting, unused code, types, Vitest, compatibility-script tests, build, bundle guard).
- SDK registration: `npx --no-install bb plugin types --check`.
- Targeted core checks: `npm test -- src/clean-defaults.test.ts src/auto-settle-t3.test.ts src/ThreadInbox.clean.test.tsx`.
- Browser acceptance: `env -i PATH="$PATH" HOME="$HOME" npm run e2e`; quick smoke: `npm run e2e:smoke`. See [scratch isolation](e2e/README.md).
- Expected result: each selected check exits zero; browser cases preserve the scenarios above. A check failure must be attributed and reported, not removed to satisfy the spec.

Existing typed style, from `src/sidebar-settings-values.ts`:

```ts
export const THREAD_DISPLAYS = ["full", "compact-working", "compact-all"] as const;
export type ThreadDisplay = (typeof THREAD_DISPLAYS)[number];
```

Boundaries: always preserve conversation access and truthful unknown states; review any proposed behavior change against this spec before implementation; never auto-delete/archive work, modify another plugin's settings/storage, or run test cleanup against the live host.

## 12. Deferred features and product decisions

The complete spec includes existing advanced behavior; it does not make every T3 feature a BB requirement.

- Independent thread/full-text search and standalone draft cards: deferred pending a concrete gap in BB's own discovery controls.
- T3 return-to-user ordering and newest-submission Working order: deferred; current BB views retain stable manual ordering and explicit alternate sorts.
- Working collapsed on first use: unresolved alternative to the current expanded default. Preserve expanded until a deliberate product decision changes it.
- Cross-section drag to pin/settle/wake, action-button sweep gestures, and multi-select bulk menus: deferred; current scope guarantees supported reorder and individual/contextual actions.
- Per-thread Never auto-settle: deferred. Explicit restore overrides and pin protection exist, but are not a permanent per-thread opt-out setting.
- T3-style snoozing while background work continues: deferred because BB's current guards and available signals differ.
- Cross-device synchronization of device preferences, independent mobile-app parity, app-wide update/usage/PR pages, and automatic cleanup scripts: outside the extension's current contract.
- Any newly requested behavior gets an explicit delta spec after this baseline is approved; existing implementation differences do not silently become requirements to remove features.

Review focus: approve the capability boundaries, baseline defaults, lifecycle protections, and deferred list. Implementation planning starts only after that review.

## References

- [Project overview](README.md) and [project rules](AGENTS.md) describe this BB adaptation.
- [T3 sidebar guide at the baseline's referenced commit](https://github.com/pingdotgg/t3code/blob/475ae52ac279152dd2c13a86a59227d3e1441e3d/docs/user/thread-sidebar.md) provides design context.
- [T3 settlement service at that commit](https://github.com/pingdotgg/t3code/blob/475ae52ac279152dd2c13a86a59227d3e1441e3d/apps/server/src/orchestration-v2/ThreadSettlementService.ts) informed automatic policy. BB-specific requirements in this document take precedence over assumptions of T3 parity.
