# Working in Thread Inbox

## Scope

Thread Inbox owns the sidebar presentation, recent-return ordering, Snooze,
Settle, Wake, Un-settle, Undo, and automatic filing rules. BB owns search,
project/thread creation, project management, notifications, retries, and runtime
management. Reuse native BB actions instead of implementing those systems here.
Do not add process shutdown, terminal cleanup, custom Continue scheduling, or
project editors to the sidebar.

Keep existing filing data, preferences, and read-only saved project appearance.
Do not add automatic project icon discovery, historical PR scans, paid title
recovery, or an Inactive shelf. Legacy inactivity preferences remain accepted
for compatibility but have no effect on placement.
Legacy Parked rows retain Resume. Normal controls do not create Parked rows.

## Architecture

- Browser entry: `app.tsx`. Server entry: `src/server.ts`. No host entry is needed.
  Keep browser, Node, and shared modules separate;
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

- A settled thread is filed. Native current-branch PR badges read on demand;
  there is no historical PR scan.
- Unknown PR results preserve the thread's place. Filing never stops a
  runtime, closes a terminal, archives, or deletes a conversation.
- Settings changes and restart do not reopen already auto-settled work. New
  work or attention can return it. Preserve queue, pin, question, and child guards.
- Declare browser keys in `src/lib/storage-keys.ts`, events in
  `src/lib/browser-events.ts`, and use the shared storage codecs/helpers.
- The display name is Thread Inbox. The package, runtime, browser namespace,
  and marketplace ID are `bb-thread-inbox`; the CLI is `bb thread-inbox`.
  Identity changes require an explicit data transfer, since BB namespaces
  plugin databases and settings by ID. Do not retain obsolete runtime aliases.
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
  Test the visible Search threads button with hidden native navigation. Review
  settings alignment and both disclosures. Record demos without simultaneous
  screenshots; watch the entire encoded animation, including its loop.
- `npm run test:stress` is manual only; run it only when the user asks.
- Preserve licenses and copyright notices for retained inherited code in
  `LICENSE`. Keep machine configuration, credentials, private audit notes, and
  live conversation screenshots out of this public repository.

## Tag-based releases

- A package version is manifest metadata, not proof of publication. Keep unreleased
  work on the planned stable X.Y.Z version and tie the README release badge
  to GitHub Releases.
  Only stable vX.Y.Z tags are supported; do not introduce version suffixes.
- Prepare a release on a branch: `npm version X.Y.Z --no-git-tag-version`, put
  the shipped notes under a nonempty `## [X.Y.Z]` section in `CHANGELOG.md`, and
  document only this project's shipped behavior. Review through a PR.
- Run `npm run check` and the isolated browser suite before release. Verify both
  lockfile version fields match the manifest. Do not publish from an unmerged branch.
- Only after the release preparation is merged and publication is authorized,
  tag that commit with `git tag -a vX.Y.Z -m 'Release vX.Y.Z'` and push that tag.
- `.github/workflows/release.yml` accepts stable `vX.Y.Z` tags included in `main`,
  checks the manifest versions and plugin, then uses the pinned
  `ysskrishna/changelog-release-action` to publish matching changelog notes.
  Missing/empty notes fail. Re-running skips an existing release. No tag is
  created by CI and no release is created by a normal branch push or PR.
- Release automation does not publish npm packages or submit marketplace entries.
  Follow `docs/marketplace.md` for BB Community listing. Security reports follow
  `SECURITY.md`. Never retag an existing release to repair it.
