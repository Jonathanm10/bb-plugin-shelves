# BB Community submission

The public registry is [get-bb/marketplace](https://github.com/get-bb/marketplace#submit-a-plugin).
A reviewed pull request adds the plugin to BB Community. BB Official is bundled
with BB and is a separate BB team decision. This repository is not listed yet.

## Order of work

1. Merge and verify the plugin PR. Resolve any agreed P1 scope reductions first.
2. Prepare and publish the first stable version using [tag-based releases](../AGENTS.md#tag-based-releases).
3. Verify a fresh install from that exact public tag on a compatible BB version.
   Recheck current marketplace requirements and SDK/host dependency placement.
4. Fork `get-bb/marketplace`, then add the entry below as `entries/bb-sidebar-clean.json`.
5. Copy `PLUGIN_OVERVIEW.md` to `overview/bb-sidebar-clean.md`. It must be plain
   supported Markdown, under 4,000 characters, with absolute HTTPS links.
6. Copy `docs/screenshots/marketplace-overview.png` to
   `screenshots/bb-sidebar-clean/overview.png`. Current community rules require
   PNG/JPEG/WebP images at least 1,200 px wide and no larger than 2 MiB; up to six.
7. In the registry checkout run `npm ci`, `npm run build`, `npm test`,
   `npm run gate:v1`, and `npm run check`. The last check validates the remote source.
8. Open the registry PR and address maintainer review. Do not advertise a store
   install command or marketplace badge until the entry is merged and visible.

A `range` source discovers stable version tags, so later compatible releases do
not require editing the registry entry. Source, name, and branding changes do.
The proposed `^0.1.0` range permits 0.1.x releases; bump it in a registry PR when
moving to 0.2.0.

## Proposed registry entry

Keep the installed plugin identity to preserve filing state. The store display
name can be Thread Inbox while the ID remains `bb-sidebar-clean`.

```json
{
  "id": "bb-sidebar-clean",
  "displayName": "Thread Inbox",
  "description": "A community BB sidebar with Working, Active, Settled, snooze, and automatic settling.",
  "icon": "PanelLeft",
  "tags": ["interface", "sidebar", "threads", "inbox", "productivity"],
  "author": {
    "name": "Y. Siva Sai Krishna",
    "github": "ysskrishna",
    "url": "https://ysskrishna.space"
  },
  "category": "thread-management",
  "overview": "./overview/bb-sidebar-clean.md",
  "screenshots": ["./screenshots/bb-sidebar-clean/overview.png"],
  "source": {
    "git": {
      "url": "https://github.com/ysskrishna/bb-thread-inbox.git",
      "range": "^0.1.0"
    }
  }
}
```

This is a prepared submission plan. No registry PR or release is created by it.
