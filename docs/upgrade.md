# Upgrading from 0.1.0

Version 0.1.1 uses `bb-thread-inbox` for the package, installed plugin, and
browser namespace. The command is `bb thread-inbox`.

BB identifies installations by their package-derived ID. A normal update of
0.1.0 cannot change that identity or automatically transfer its database.
Install 0.1.1 separately. Keep the previous installation until you verify the
transfer; running both sidebar policies at once is unsupported.

## Preserve filing data

1. Find the previous installation's ID with `bb plugin list` and its BB data
   directory with `bb status`. Disable that installation with
   `bb plugin disable <previous-id>` before copying data.
2. Back up `<bb-data-dir>/plugins/<previous-id>/data.db` using SQLite's
   `.backup` command. A plain copy of a running SQLite database can miss WAL
   transactions. Keep the backup until the new installation is verified.
3. Before installing 0.1.1, create
   `<bb-data-dir>/plugins/bb-thread-inbox/` and restore the backup as `data.db`.
   Stop if that target already contains a database; do not overwrite an
   existing installation. If already installed, disable it and back up its
   data before choosing which database to keep.
4. Install the release:

   ```sh
   bb plugin install git:github.com/ysskrishna/bb-thread-inbox@v0.1.1
   bb settings ui set sidebar.threadListProvider bb-thread-inbox/inbox
   ```

5. Confirm Settled, Snoozed, settings, and saved project appearance. The database
   retains filing state, manual ordering, settings, and project appearance.
   Browser-only layout preferences start fresh under the new namespace.
6. Remove the disabled previous installation with `bb plugin remove <previous-id>`
   only after verification. Keep the backup separately. BB conversations and
   projects are independent of the plugin database.

The plugin does not register deprecated IDs, routes, CLI commands, or browser
storage aliases. Historical database migrations remain intact.
