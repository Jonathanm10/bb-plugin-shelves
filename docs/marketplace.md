# BB Community submission

The public registry is [get-bb/marketplace](https://github.com/get-bb/marketplace#submit-a-plugin).
A reviewed pull request adds the plugin to BB Community. BB Official is bundled
with BB and is a separate BB team decision. The
[community submission](https://github.com/get-bb/marketplace/pull/1006) is awaiting
maintainer review; it is not a live store listing yet.

## Order of work

1. Merge and verify the plugin PR.
2. Publish the stable version using [tag-based releases](../AGENTS.md#tag-based-releases).
3. Verify a fresh install from that exact public tag on a compatible BB version.
   Recheck current marketplace requirements and SDK/host dependency placement.
4. Fork `get-bb/marketplace`, then add the entry below as `entries/bb-thread-inbox.json`.
5. Copy `PLUGIN_OVERVIEW.md` to `overview/bb-thread-inbox.md`. It must be plain
   supported Markdown, under 4,000 characters, with absolute HTTPS links.
6. Copy `docs/screenshots/marketplace-overview.png` to
   `screenshots/bb-thread-inbox/overview.png`. Current community rules require
   PNG/JPEG/WebP images at least 1,200 px wide and no larger than 2 MiB; up to six.
7. In the registry checkout run `npm ci`, `npm run build`, `npm test`,
   `npm run gate:v1`, and `npm run check`. The last check validates the remote source.
8. Open the registry PR and address maintainer review. Do not advertise a store
   install command or marketplace badge until the entry is merged and visible.

A `range` source discovers stable version tags, so later compatible releases do
not require editing the registry entry. Source, name, and branding changes do.
The `^0.1.1` range permits later 0.1.x releases; bump it in a registry PR when
moving to 0.2.0.

## Registry entry

The package, runtime, and marketplace share the `bb-thread-inbox` identity.
The first marketplace release is 0.1.1.

```json
{
  "id": "bb-thread-inbox",
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
  "overview": "./overview/bb-thread-inbox.md",
  "screenshots": ["./screenshots/bb-thread-inbox/overview.png"],
  "source": {
    "git": {
      "url": "https://github.com/ysskrishna/bb-thread-inbox.git",
      "range": "^0.1.1"
    }
  }
}
```

Update the existing submission after publishing and testing the new tag.
