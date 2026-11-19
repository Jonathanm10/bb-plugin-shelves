# BB Sidebar Clean

A compact BB sidebar with three everyday sections:

- **Active** - completed results, questions, errors, and conversations ready for you.
- **Working** - agents still running or waiting on work. They return to Active automatically.
- **Settled** - quiet and finished work, collapsed and available when you need it. New agent activity brings it back.

Threads use one line by default. Reading a conversation does not file it. You do not need to settle every completed thread manually.

The proposed [product specification](SPEC.md) covers the complete sidebar behavior, defaults, BB integration boundaries, advanced capabilities, and acceptance scenarios.

## Automatic settling

| Rule | Default |
| --- | --- |
| Auto-settle inactive threads | On, after 7 days |
| Auto-settle merged threads | On |
| Closed pull requests | Settle automatically, independently of the merge switch |
| Keep threads with a PR | Off; enable to exempt PR threads from inactivity settling |

Rules run when the sidebar opens and every five minutes on the BB server. They continue with the browser closed while BB is running. A completed result stays Active until a rule applies. Settings save automatically.

Running work, queued messages, pending questions, pinned threads, and live descendants prevent settling. Missing PR data keeps a thread visible until it can be checked. PR rules use BB's GitHub PR Status plugin. Automatic settling never archives or deletes a conversation.

Appearance, grouping, child-thread controls, and project management are under **Advanced settings**. Compact menus hide Park and Snooze; the inherited full-card layout retains those optional actions. Pinning and legacy shelves remain compatible. The extra Inactive shelf is off by default.

## Install the review branch

Requires BB 0.49.0 or newer.

```sh
bb plugin install git:github.com/ysskrishna/bb-sidebar-clean@feature/t3-clean-sidebar --yes
bb settings ui set sidebar.threadListProvider bb-sidebar-clean/inbox
```

Disable other sidebar plugins' automatic policies before trying this one. Selecting a different visual provider alone does not stop its background jobs.

For development:

```sh
git clone https://github.com/ysskrishna/bb-sidebar-clean.git
cd bb-sidebar-clean
git switch feature/t3-clean-sidebar
npm ci
npm run check
bb plugin install .
bb settings ui set sidebar.threadListProvider bb-sidebar-clean/inbox
```

The plugin has its own database, browser-storage namespace, and `bb clean-sidebar` command. It does not import or overwrite Beside or BB Sidebar settings. Disable this plugin to stop its background policy before switching back.

## Implementation and checks

This independent repository starts from [BB Sidebar v0.3.12](https://github.com/yusuf8834/bb-sidebar/tree/a2f65687517cc5e3513d71017cea5a3306c11313). Its original license and notices are preserved. [T3 Code's settlement service](https://github.com/pingdotgg/t3code/blob/475ae52ac279152dd2c13a86a59227d3e1441e3d/apps/server/src/orchestration-v2/ThreadSettlementService.ts) and [thread behavior documentation](https://github.com/pingdotgg/t3code/blob/475ae52ac279152dd2c13a86a59227d3e1441e3d/docs/user/thread-sidebar.md) informed the lifecycle rules. No model or decision API is used.

This is a BB adaptation. BB exposes different activity and PR signals: terminal PR eligibility compares the PR update time with the latest thread activity, and background commands or serving ports conservatively keep a thread visible. It does not reproduce every T3 lifecycle detail.

```sh
npm run check
npm test -- src/auto-settle-t3.test.ts src/ThreadInbox.clean.test.tsx
env -i PATH="$PATH" HOME="$HOME" npm run e2e -- --grep 'clean sidebar'
```

The browser runner uses a disposable BB server and test threads. It does not operate on your live conversations. See [browser test isolation](e2e/README.md).
