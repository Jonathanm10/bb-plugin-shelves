# Scope audit for 0.1.0

Reviewed runtime entry points, background jobs, RPC callers, settings, dynamic UI
registration, and tests. No usage telemetry is collected, so a reachable feature
is not called unused simply because it is optional. Confidence describes the
source evidence. S is up to half a day; M is roughly one to two days including
verification.

## Completed cleanup

| Priority | Decision | Confidence | Size |
| --- | --- | --- | --- |
| P1 | Removed paid automatic title recovery and manual title regeneration. BB owns titles. Historical migration/table retained. | 99% | S |
| P1 | Removed historical PR event scanning, its caches, hover history, RPC and `gh` host entry. The stale closed-PR cache disappeared with this subsystem. Native current-branch status and PR-based auto-settling remain. | 99% | M |
| P1 | Removed automatic favicon discovery, manifest/HTML parsing, candidate traversal, and project file search. Unconfigured projects use letter tiles without file reads. Explicitly saved paths/uploads and saved colors remain readable. | 99% | M |
| P2 | Retired the optional Inactive shelf and its controls/classification. Legacy settings remain accepted and stored; they cannot create another shelf or hide quiet Active threads. | 99% | M |
| P1 | Added a visible native Search threads button. It works with fresh settings and hidden native search navigation. | 99% | S |
| P2 | Aligned settings help and disclosures; separated screenshots from video capture to avoid recording artifacts. | 99% | S |

Workspace port detection, Docker/process inspection, polling, links, and
port-based filing exceptions were also removed. Filing never stops a process.

## Deliberately retained after tracing callers

| Area | Why it remains | Confidence |
| --- | --- | --- |
| Parent assignment and guarded deletion | These are reachable menu actions with server handlers and child-tree behavior, not unused code. Existing parent changes reopen the ancestor path; deletion previews include archived/lifecycle dependents. Removing the safeguards while keeping deletion would reduce safety. | 99% |
| Density, grouping and manual ordering | Settings and row renderers actively use them, and saved preferences restore them. They are optional presentation choices under Advanced settings, rather than additional thread states. | 99% |
| Saved project appearance | Existing settings, fixtures, and renderers use colors and explicit icons. No new project appearance editor or automatic discovery remains. | 99% |
| Legacy Parked recovery | Existing records must stay reachable through Resume. Normal controls cannot create Parked rows. | 99% |
| Database migrations and storage codecs | They preserve installed data and settings. Old labels in immutable fixtures are provenance, not this project's release history. | 99% |
| Native lifecycle guards and PR policy | Running work, queued work, questions, pins, and children must remain reachable. Unknown PR state preserves placement. | 99% |

No new P0 defect was established by this scoped review. This is not a full
security audit or a claim that all possible bugs are excluded.

## Verification gates

Meaningful regression tests cover visible search activation, retired RPCs,
no project-file access for default icons, and legacy Inactive preferences.
The release also requires the repository checks and isolated browser flows,
including hidden search navigation, both settings themes, narrow sidebars,
filing/Undo, persistence, and a full playback review of the encoded GIF.

Publication follows [tag-based releases](../AGENTS.md#tag-based-releases).
The separate [BB Community submission plan](marketplace.md) is unchanged.
