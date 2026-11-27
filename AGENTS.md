# Working in Shelves

Shelves is Jonathan's BB sidebar plugin: Working, Active, Snoozed and Settled
shelves, with Snooze, Settle and automatic filing. It started as a fork of
Thread Inbox (`upstream` remote).

## Design

For any look or behaviour question, do what T3 Code's sidebar does, and leave
out what it lacks. Read its source before proposing a design:
[pingdotgg/t3code](https://github.com/pingdotgg/t3code) on `main`,
`apps/web/src/components/Sidebar.tsx` and `sidebar/SidebarThreadRow.tsx`.

## Scope

- Shelves owns the sidebar's presentation and filing. BB owns search, thread
  and project creation, notifications, retries and runtimes: call BB's native
  actions for those.
- Filing only moves a thread between shelves. Runtimes, terminals, archives and
  conversations stay as they are.
- Automatic settling leaves a thread alone while it is running, queued, pinned,
  asking a question, or has a live child, and when its PR state is unknown.
- Parked is legacy: existing Parked rows keep Resume, and no control creates one.

## Identity and data

- Display name Shelves, package `bb-plugin-shelves`, plugin ID `shelves` (BB
  drops the `bb-plugin-` prefix), CLI `bb shelves`, sidebar provider
  `shelves/inbox`.
- BB stores a plugin's database and settings under its ID, so an ID change needs
  a data transfer.
- Add a migration for every schema change; installed databases are never reset.
  A migration that destroys data needs Jonathan's yes.
- `src/fixtures/` holds databases written by earlier formats. They are
  immutable; `sha256.json` guards them.

## Code conventions

- Browser entry `app.tsx`, server entry `src/server.ts`. Browser, Node and
  shared modules stay separate; `npm run lint` enforces the boundaries.
- Experimental SDK hooks go through `src/bb-sdk.ts`.
- Thread links use `thread.href`, which keeps BB's split and full-screen routing.
- Read plugin data through `useSidebarRead`. Register cache tags in
  `src/rpc-tags.ts` and invalidate them after a write.
- Declare browser storage keys in `src/lib/storage-keys.ts` and DOM events in
  `src/lib/browser-events.ts`.
- Lifecycle placement lives in `src/lifecycle.ts`; the server mirrors it.
- Delete dead code instead of adding a Knip exception.

## Checks

- Node 22, pinned in `mise.toml`: run every script as `mise exec -- npm run <script>`.
  `npm run check` and `npm test` stop at once on another version.
- `npm ci` once, then `npm run check` before and after a change.
- Browser tests run only through the scratch launcher (`npm run e2e`, see
  `e2e/README.md`), never against the live BB. The seeder can lose a race on a
  busy machine ("Idle fixture is not initialized"): run it again.
- A regression test fails before its fix.
- `npm run test:stress` runs only when Jonathan asks.

## Changes

- Work on a task branch and commit each verified slice. Merge when Jonathan asks.
- Commits and PRs name human authors only.
- A user-visible change gets one line under `## [Unreleased]` in `CHANGELOG.md`.
- A UI change is shown with captures from `e2e-artifacts/screenshots/`, taken on
  disposable fixture data. `docs/demo.gif` is the only committed capture.
- The repository is public: machine configuration, credentials and live
  conversation screenshots stay out of it.

## Taking a change from upstream

`git fetch upstream`, then cherry-pick the commit. Upstream's names map to
ours: `bb-thread-inbox` is `shelves`, `bb thread-inbox` is `bb shelves`, and
"Thread Inbox" is "Shelves". Keep the upstream copyright line in `LICENSE`.
