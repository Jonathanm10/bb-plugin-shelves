import type { ConfiguredSnoozePreset } from "./lifecycle";
import { SnoozeSelect } from "./SnoozeSelect";
import { Icon } from "./components/Icon";
import { cn } from "./lib/utils";

function SettleButton({ label, onActivate }: { label: string; onActivate: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate();
      }}
      // The colour change is the whole hover, as on Snooze beside it.
      className={cn(
        "flex h-6 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground",
        "transition-colors duration-200 ease-out hover:text-[color:var(--bb-thread-inbox-settle-active)]",
        "focus-visible:text-[color:var(--bb-thread-inbox-settle-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        "motion-reduce:transition-none",
      )}
    >
      <Icon name="Check" aria-hidden className="size-3.5 shrink-0" />
      <span>Settle</span>
    </button>
  );
}

export function ThreadFilingActions({
  snoozePresets,
  onOpenChange,
  onSnooze,
  onSettle,
}: {
  snoozePresets: readonly ConfiguredSnoozePreset[];
  onOpenChange: (open: boolean) => void;
  onSnooze?: (until: number) => void;
  onSettle?: () => void;
}) {
  return (
    <>
      {onSnooze ? (
        <SnoozeSelect
          label="Snooze thread"
          snoozePresets={snoozePresets}
          triggerClassName="h-5 w-5 border-0 px-0.5 py-0 shadow-none duration-200 ease-out hover:bg-transparent hover:duration-200 hover:text-[color:var(--bb-thread-inbox-snooze-active)] focus:ring-0 focus-visible:text-[color:var(--bb-thread-inbox-snooze-active)] data-[state=open]:text-[color:var(--bb-thread-inbox-snooze-active)] motion-reduce:transition-none [&>svg:last-child]:size-3"
          onOpenChange={onOpenChange}
          onSnooze={onSnooze}
        />
      ) : null}
      {onSettle ? <SettleButton label="Settle thread" onActivate={onSettle} /> : null}
    </>
  );
}
