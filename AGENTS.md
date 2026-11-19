# Working in Thread Inbox

## Scope

Thread Inbox owns the sidebar presentation, recent-return ordering, Snooze,
Settle, Wake, Un-settle, Undo, and automatic filing rules. BB owns search,
project/thread creation, project management, notifications, retries, and runtime
management. Reuse native BB actions instead of implementing those systems here.
Do not add process shutdown, terminal cleanup, custom Continue scheduling, or
project editors to the sidebar.

Keep existing filing data, preferences, and read-only project appearance.
Legacy Parked rows retain Resume. Normal controls do not create Parked rows.

## Architecture

- Browser entry: `app.tsx`. Server entry: `src/server.ts`. Host entry:
  `src/pr-host.ts`. Keep browser, Node, and shared modules separate;
  `biome.json` and `scripts/check-import-boundaries.mjs` enforce the boundaries.
- Experimental app SDK hooks go through `src/bb-sdk.ts`.
- Use BB's status resolver for display through `src/working-tree.ts` and
  `src/StatusSlot.tsx`. Lifecycle placement and guards use shared signals in
  `src/lifecycle.ts`, mirrored by the server.
- Thread links use `thread.href`, so native split and Full Screen behavior is
  preserved. `onNavigate` reports opening; it does not replace link routing.
- Native thread actions own pin/read state, rename requests, splits, copy link,
  and archive. Keep the plugin's named tree-delete confirmation and busy guards.
- Read plugin data through `useSidebarRead` and the shared BB query cache.
  Register tags in `src/rpc-tags.ts`; invalidate those tags after writes.
  Keep shared schemas in `src/contract.ts` out of browser value imports.

## State and background work

- A settled thread is filed. Recurring scans and PR lookups skip settled work;
  read it on demand when opened, hovered, or returned to Active.
- Unknown PR results preserve the thread's place. Filing never stops a
  runtime, closes a terminal, archives, or deletes a conversation.
- Settings changes and restart do not reopen already auto-settled work. New
  work or attention can return it. Preserve queue, pin, question, and child guards.
- Declare browser keys in `src/lib/storage-keys.ts`, events in
  `src/lib/browser-events.ts`, and use the shared storage codecs/helpers.
- The public repository and display name are Thread Inbox. The technical
  package name `bb-plugin-bb-sidebar-clean`, runtime ID `bb-sidebar-clean`,
  storage keys, and endpoint paths preserve installed data. Do not rename
  them without an explicit migration.
- Append database migrations; do not reset installed databases. Immutable
  files in `src/fixtures/` cover inherited schema formats. Their labels are
  fixture provenance, not this project's release versions. Do not edit them.

## Checks and changes

- Keep changes focused and behavior-preserving unless the task changes scope.
  Commit verified slices on a task branch. Follow the PR template; do not merge
  without the user's request. No AI authors or attribution trailers.
- Run `npm ci` in a fresh checkout to install the hooks. Run `npm run check`
  before and after source changes. It covers lint, formatting, Knip, types,
  unit/integration tests, script checks, build, and bundle boundaries.
- Remove unused imports/exports; do not add Knip exceptions for dead code.
  Production files/scripts stay within 500 lines and tests within 1,000;
  `scripts/check-file-sizes.mjs` records the remaining ThreadCard exception.
- Keep meaningful native status, filing, persistence, and safety coverage when
  retiring tests for removed features. Prove regressions fail before their fix.
- Run browser tests only through the isolated scratch launcher, never against
  the live host. See `e2e/README.md`. Capture current light/dark/narrow images
  using disposable fixture data; public docs do not use before/after comparisons.
- `npm run test:stress` is manual only; run it only when the user asks.
- Preserve licenses and copyright notices for retained inherited code in
  `LICENSE`. Keep machine configuration, credentials, private audit notes, and
  live conversation screenshots out of this public repository.
