import type { ConfiguredSnoozePreset } from "./lifecycle";
import { SnoozeSelect } from "./SnoozeSelect";
import { Icon } from "./components/Icon";
import { cn } from "./lib/utils";

function SettleButton({ label, settling, onActivate }: { label: string; settling: boolean; onActivate: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-settling={settling ? "" : undefined}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate();
      }}
      className={cn(
        "bb-sidebar-settle relative flex h-6 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground",
        "transition-colors duration-200 ease-out hover:text-[color:var(--bb-sidebar-settle-active)]",
        "focus-visible:text-[color:var(--bb-sidebar-settle-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        "motion-reduce:transition-none",
        settling && "text-[color:var(--bb-sidebar-settle-active)]",
      )}
    >
      {/* Move only the artwork so hovering an edge cannot move the hit area. */}
      <span
        aria-hidden="true"
        className="bb-sidebar-settle-art pointer-events-none relative flex size-5 shrink-0 items-center justify-center rounded-[inherit]"
      >
        <Icon name="Check" aria-hidden className="bb-sidebar-settle-check size-3.5" />
        <span className="bb-sidebar-settle-stars">
          {[0, 1, 2].map((star) => (
            <span key={star} className="bb-sidebar-settle-star" />
          ))}
        </span>
      </span>
      <span>Settle</span>
    </button>
  );
}

export function ThreadFilingActions({
  snoozePresets,
  onOpenChange,
  onSnooze,
  onSettle,
  settling,
}: {
  snoozePresets: readonly ConfiguredSnoozePreset[];
  onOpenChange: (open: boolean) => void;
  onSnooze?: (until: number) => void;
  onSettle?: () => void;
  settling: boolean;
}) {
  return (
    <>
      {onSnooze ? (
        <SnoozeSelect
          label="Snooze thread"
          snoozePresets={snoozePresets}
          triggerClassName="h-5 w-5 border-0 px-0.5 py-0 shadow-none duration-200 ease-out hover:bg-transparent hover:duration-200 hover:text-[color:var(--bb-sidebar-snooze-active)] focus:ring-0 focus-visible:text-[color:var(--bb-sidebar-snooze-active)] data-[state=open]:text-[color:var(--bb-sidebar-snooze-active)] motion-reduce:transition-none [&>svg:last-child]:size-3"
          onOpenChange={onOpenChange}
          onSnooze={onSnooze}
        />
      ) : null}
      {onSettle ? <SettleButton label="Settle thread" settling={settling} onActivate={onSettle} /> : null}
    </>
  );
}
