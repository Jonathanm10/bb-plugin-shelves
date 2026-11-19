# Screenshot and recording provenance

These assets are browser captures of Thread Inbox running inside a real,
disposable BB 0.50.1 instance on macOS. The plugin is the development code in this
PR, version `0.1.0-dev.0`. Data is a seeded Product platform project and four
fixed-title conversations. No real user conversations are published.

- `thread-inbox-demo.gif`: continuous Playwright screen recording converted to
  GIF at five frames per second, scaled to 900 px wide with initial loading trimmed. It shows the full browser viewport in dark mode,
  including Settle, Un-settle, Snooze, Wake, and native search. It is not an
  AI-generated animation or a reconstructed interface.
- `sidebar-*`, `actions-*`, `settled-threads`, `snooze-options`, and
  `snoozed-threads`: screenshots cropped to the actual plugin sidebar element.
  They omit BB's surrounding navigation and thread pane. Sidebar widths are
  280 or 320 px; they are not screenshots of the entire desktop application.
- `native-search.png` and `auto-settle-settings.png`: full browser screenshots
  of native search and the plugin's settings page.
- `marketplace-overview.png`: a clearly separate composite joining four real
  sidebar screenshots horizontally. It meets the registry's 1,200 px minimum
  width without stretching them. It does not depict one application window.

Fresh preferences, fixed browser dimensions, demo titles, light/dark themes,
and reduced-motion settings make these reproducible. The live desktop can
look different because of its width, theme, saved settings, and thread states.
The settings capture shows PR inactivity protection enabled as part of its
persistence check; the shipped default is disabled.

Regenerate using the [browser media instructions](../../e2e/README.md#readme-media).
Use a disposable copy of the installed app for desktop-version comparisons.
Keep the pinned minimum-version browser tests and internal visual baselines
separate from these public captures.
