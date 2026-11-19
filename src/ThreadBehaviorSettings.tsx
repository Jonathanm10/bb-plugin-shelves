import { MAX_AUTO_SETTLE_AFTER_DAYS, MIN_AUTO_SETTLE_AFTER_DAYS } from "./auto-settle";
import {
  InlineNumber,
  SettingRow,
  SettingsSection,
  SettingsGroup,
  SwitchRow,
  type SettingsDraftSectionProps,
} from "./settings-ui";

export function ThreadBehaviorSettings({
  draft,
  update,
  status,
  autoSettleDaysValid,
  snoozePresetsError,
  snoozePreview,
}: SettingsDraftSectionProps & {
  autoSettleDaysValid: boolean;
  snoozePresetsError: string | null;
  snoozePreview: string[];
}) {
  return (
    <SettingsSection title="Thread behavior" status={status}>
      <SettingsGroup title="Auto-settle">
        <SwitchRow
          title="Auto-settle inactive threads"
          description="Threads with no activity for this long settle automatically. New activity brings them back."
          checked={draft.autoSettleInactive}
          onChange={(checked) => update("autoSettleInactive", checked)}
        >
          {draft.autoSettleInactive ? (
            <InlineNumber
              label="Days of inactivity before auto-settle"
              prefix="After"
              suffix="days without activity"
              value={draft.autoSettleAfterDays}
              min={MIN_AUTO_SETTLE_AFTER_DAYS}
              max={MAX_AUTO_SETTLE_AFTER_DAYS}
              valid={autoSettleDaysValid}
              errorId="auto-settle-days-error"
              onChange={(value) => update("autoSettleAfterDays", value)}
            />
          ) : null}
        </SwitchRow>
        <SwitchRow
          title="Auto-settle merged threads"
          description="Settle a thread when its pull request merges. Closed pull requests still settle automatically."
          checked={draft.autoSettleOnMerge}
          onChange={(checked) => update("autoSettleOnMerge", checked)}
        />
        <SwitchRow
          title="Keep threads with a PR"
          description="Inactivity does not settle threads with a pull request. Merge and close still do."
          checked={draft.autoSettleKeepPullRequests}
          onChange={(checked) => update("autoSettleKeepPullRequests", checked)}
        />
      </SettingsGroup>
      <details className="mx-4 mb-2 mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer rounded py-1 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Snooze shortcuts
        </summary>
        <SettingsGroup title="Snooze">
          <SettingRow
            title="Snooze shortcuts"
            description={
              <>
                Comma-separated. Durations like <Code>30m</Code> or <Code>2h</Code>, times like{" "}
                <Code>evening@18:00</Code>, <Code>tomorrow@09:00</Code> or <Code>next-week@09:00</Code>. Rename one with{" "}
                <Code>Label=value</Code>.
              </>
            }
          >
            <textarea
              aria-label="Snooze shortcuts"
              aria-invalid={snoozePresetsError !== null}
              aria-describedby="snooze-shortcuts-feedback"
              value={draft.snoozePresets}
              onChange={(event) => update("snoozePresets", event.target.value)}
              rows={2}
              spellCheck={false}
              className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs leading-5 text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
            />
            <div id="snooze-shortcuts-feedback" className="mt-1.5">
              {snoozePresetsError ? (
                <p className="text-2xs text-destructive">{snoozePresetsError}</p>
              ) : (
                <ul aria-label="Snooze menu preview" className="flex flex-wrap items-center gap-1">
                  {snoozePreview.map((label, index) => (
                    <li
                      key={`${index}-${label}`}
                      className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-2xs text-muted-foreground"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SettingRow>
        </SettingsGroup>
      </details>
    </SettingsSection>
  );
}

function Code({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-px font-mono text-2xs text-foreground/80">{children}</code>;
}
