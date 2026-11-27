# Changelog

Shelves started as a fork of [Thread Inbox](https://github.com/ysskrishna/bb-thread-inbox) 0.1.1. That project's changelog holds the earlier history.

## [Unreleased]

### Fixed

- The Snooze button shows the pointer cursor on hover, like Settle.
- Settle marks the settled thread and its settled children read, so a finished thread you never opened stops showing as unread. Undo makes them unread again unless bb recorded a new read since.

### Added

- Thread cards name the machine a thread runs on, matching T3 Code: the title gets its own line and the machine name leads the metadata line under it, with the pull request and provider glyph at its end. One-line rows (compact cards, Snoozed, Settled) and threads without a machine are unchanged.
- The row's right-click menu shows thread actions that other plugins add, such as bb's thread notifications, each in the section of its group. bb's native thread list's Move to section stays out, because Shelves does not show those sections.

### Changed

- Renamed to Shelves. The plugin ID is `shelves`, the CLI is `bb shelves`, the sidebar provider is `shelves/inbox`, and browser storage keys start with `shelves:`. A Thread Inbox install keeps its own data; the README shows how to copy it over.
- Thread card titles stand out from the project and machine lines, as in T3 Code: the title keeps the full text colour and active or unread titles turn medium weight, while the project and machine drop to 70% of the text colour (4.8:1 contrast in light, 5.3:1 in dark) at one size, with a larger project icon.
- Thread cards take T3 Code's size and spacing: a 14px title on a 20px line (was 13px), 8px above and below the card (was 6px) and 4px between the project and the title (was 2px), for 78px cards (was 71px).
- Settle acts on the click. The 520 ms sweep that played before the request was sent is gone, so the request leaves with the click and the row moves as soon as the server answers (about 30 ms in the scratch browser, was about 540 ms).
- Settle and Snooze take the text colour on hover, as T3 Code's row actions do, with no transition. Settle's lifting check, glow, three sparkles and green are gone, and so is Snooze's orange; with the sparkles went the last hover animation that looped.
- Shelf headers (Pinned, Active, Working, Snoozed, Parked, Settled) are a label and a rule, without an icon.
- The scratch e2e server renames its machine to "Scratch MacBook", so captures and visual baselines do not contain the developer's hostname.
- The e2e seeds tolerate any provider notification that BB does not map (`provider/unhandled`), so a newer Codex CLI cannot fail them. Agent output and provider errors still fail them.

### Removed

- The tag-release workflow, the "BB compat" workflow, the marketplace listing guide, and the README screenshot gallery. Browser tests now save their captures under the ignored `e2e-artifacts/screenshots/`.
