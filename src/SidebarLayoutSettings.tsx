import { THREAD_DISPLAYS, type ThreadDisplay } from "./sidebar-settings-values";
import { SettingRow, SettingsSection, SettingsSelect, SwitchRow, type SettingsDraftSectionProps } from "./settings-ui";

const THREAD_DISPLAY_LABELS: Record<ThreadDisplay, string> = {
  full: "Full cards",
  "compact-working": "Compact working threads",
  "compact-all": "Compact all threads",
};

export function SidebarLayoutSettings({ draft, update, status }: SettingsDraftSectionProps) {
  return (
    <SettingsSection title="Sidebar layout" status={status}>
      <SettingRow
        title="Thread display"
        description="Full cards show the project and status above the title. Compact working threads use one line while a thread or its child agents are working. Compact all threads keeps every thread on one line, with its status, unread state, and children chip."
        control={
          <SettingsSelect
            aria-label="Thread display"
            value={draft.threadDisplay}
            onChange={(event) => update("threadDisplay", event.target.value as ThreadDisplay)}
            className="w-52"
          >
            {THREAD_DISPLAYS.map((display) => (
              <option key={display} value={display}>
                {THREAD_DISPLAY_LABELS[display]}
              </option>
            ))}
          </SettingsSelect>
        }
      >
        {draft.threadDisplay === "compact-all" ? (
          <div className="border-l-2 border-border">
            <SwitchRow
              title="Keep pinned threads full"
              description="Pinned threads keep their full cards."
              checked={draft.keepPinnedThreadsFull}
              onChange={(checked) => update("keepPinnedThreadsFull", checked)}
            />
            <SwitchRow
              title="Keep woken threads full"
              description="A snoozed thread that wakes shows a full card until you open it or dismiss its Woke marker."
              checked={draft.keepWokeThreadsFull}
              onChange={(checked) => update("keepWokeThreadsFull", checked)}
            />
          </div>
        ) : null}
      </SettingRow>
      <SwitchRow
        title="Hide project names in compact cards"
        description="Keep the project icon and hide its name on compact cards in Active, Pinned, and Working. Hover to see the project name."
        checked={draft.compactProjectIconOnly}
        onChange={(checked) => update("compactProjectIconOnly", checked)}
      />
      <SwitchRow
        title="Dock shelves to the bottom"
        description="Keep shelves below Active at the bottom of the sidebar. Expanded shelves scroll with the thread list."
        checked={draft.dockShelves}
        onChange={(checked) => update("dockShelves", checked)}
      />
    </SettingsSection>
  );
}
