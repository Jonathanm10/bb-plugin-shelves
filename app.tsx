// A readable Working, Active, and Settled sidebar. Native BB owns search,
// project creation, and notifications; this plugin owns filing and presentation.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import "./src/theme.css";
import { ThreadInbox } from "./src/ThreadInbox";
import { ParentChip } from "./src/ParentChip";
import { SidebarSettings } from "./src/SidebarSettings";
import { registerThreadHeaderAction } from "./src/bb-sdk";
import { registerSnoozeCommands } from "./src/lib/snooze-commands";

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: "sidebar-settings",
    component: SidebarSettings,
  });

  app.slots.experimental_threadList({
    id: "inbox",
    title: "Thread Inbox",
    description: "Readable Working, Active, and Settled with snooze and automatic filing.",
    component: ThreadInbox,
  });

  // An open child thread names its parent here. The list draws a child inside
  // its parent's row, not as a row of its own, so this chip is the way back
  // up from the child's own page.
  registerThreadHeaderAction(app.slots, {
    id: "parent",
    title: "Parent thread",
    component: ParentChip,
  });

  // Palette commands act on the thread in view, so a thread can be snoozed
  // without finding its row.
  registerSnoozeCommands(app.commands);
});
