# Thread Inbox

[![CI](https://github.com/ysskrishna/bb-thread-inbox/actions/workflows/ci.yml/badge.svg?event=pull_request)](https://github.com/ysskrishna/bb-thread-inbox/actions/workflows/ci.yml) [![Version](https://img.shields.io/badge/version-0.1.0-blue)](CHANGELOG.md) [![License: MIT](https://img.shields.io/badge/License-MIT-blue)](LICENSE) [![Author site](https://img.shields.io/badge/author-ysskrishna.space-informational)](https://ysskrishna.space)

A community sidebar for [BB](https://getbb.app) that keeps ongoing work, returned results, and finished conversations easy to find.

| Light | Dark |
| --- | --- |
| ![Thread sidebar in light mode](docs/screenshots/sidebar-light-320.png) | ![Thread actions in dark mode](docs/screenshots/actions-dark-320.png) |

## Features

- **Working** holds continuing work, folded at the bottom by default.
- **Active** shows results, errors, and questions, with recent returns first.
- **Settled** keeps filed conversations accessible without filling the main list.
- **Snooze / Wake** defer a thread until later without answering its question or stopping its runtime.
- **Settle / Un-settle / Undo** file finished work and restore it when needed.
- Automatic settling handles inactivity and merged or closed pull requests. Defaults are seven days, merged-PR settling on, and PR inactivity protection off.
- Readable cards support keyboard actions, touch, narrow sidebars, and light/dark themes.

Search, project and thread creation, and notifications use BB's native features. Use **Cmd/Ctrl+K** to search, including settled conversations, and **Project picker > New project** to create a project.

Filing never archives or deletes a conversation. Running work, unanswered questions, queues, pins, and live children protect threads from automatic settling. Reading alone does not settle a thread. Rule changes leave settled work filed; new activity can return it.

## Installation

Requires **BB 0.49.0 or newer**. The initial version is available on the review branch:

```sh
bb plugin install git:github.com/ysskrishna/bb-thread-inbox@feature/t3-clean-sidebar --yes
bb settings ui set sidebar.threadListProvider bb-sidebar-clean/inbox
```

Disable other sidebar plugins before trying this one so their background policies do not run alongside it. The internal identifier remains `bb-sidebar-clean` to preserve existing settings and filing data.

## Settings

Open **Settings > Thread Inbox** for Working and automatic settling preferences. **Keep threads with a PR** exempts known PR threads from inactivity; merge and close rules still apply. Unknown PR state keeps the thread in place. Rules run when the sidebar opens and every five minutes on the server.

For missing desktop banners, check **Settings > Push notifications** in the main BB window. The desktop switch and device permission must both allow notifications. BB suppresses system alerts for a thread already focused on that client. On macOS, also check BB's notification and Focus settings. Test with BB open while viewing another thread or app; mobile delivery is independent.

## Development

```sh
git clone https://github.com/ysskrishna/bb-thread-inbox.git
cd bb-thread-inbox
git switch feature/t3-clean-sidebar
npm ci
npm run check
```

Run browser checks against an isolated scratch BB server:

```sh
env -i PATH="$PATH" HOME="$HOME" npm run e2e -- --grep 'core sidebar'
```

See [browser test setup](e2e/README.md) for Chromium, fixture-provider requirements, and isolation details. Browser fixtures contain disposable data. Working order uses observed run starts with activity fallbacks because BB exposes no sidebar submission timestamp.

## Inspiration

Based on [BB Sidebar](https://github.com/yusuf8834/bb-sidebar), with inspiration from [Sidebar Pro](https://github.com/kr3t3n/bb-plugin-sidebar-pro) and [T3 Code](https://github.com/pingdotgg/t3code). Inherited port parsing comes from [bb-plugin-worktree-ports](https://github.com/xlightxyearx/bb-plugin-worktree-ports). Copyright and license notices are retained in [LICENSE](LICENSE).

## Built and maintained by

| | Name | GitHub | Role |
| --- | --- | --- | --- |
| <img src="https://github.com/ysskrishna.png?size=120" width="60" height="60" alt="Y. Siva Sai Krishna"> | **Y. Siva Sai Krishna** | [@ysskrishna](https://github.com/ysskrishna) | Maintainer |

## Changelog

See [CHANGELOG](CHANGELOG.md) for this project's release notes.

## Support

- Star the repository.
- [Report an issue](https://github.com/ysskrishna/bb-thread-inbox/issues) or submit a pull request.
- [Sponsor on GitHub](https://github.com/sponsors/ysskrishna) or [Patreon](https://patreon.com/ysskrishna).

## License

[MIT](LICENSE). Includes the original copyright notices for inherited code.

---

<p align="left">
  <a href="https://github.com/ysskrishna">Author's GitHub</a> ·
  <a href="https://linkedin.com/in/ysskrishna">Author's LinkedIn</a> ·
  <a href="https://ysskrishna.space">Author's site</a> ·
  <a href="https://github.com/ysskrishna/bb-thread-inbox/issues">Report issues</a>
</p>
