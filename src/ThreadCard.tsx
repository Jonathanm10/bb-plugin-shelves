import { SECONDARY_LABEL_CLASS, ThreadMachine, ThreadPullRequest } from "./ThreadMetadata";
import { CompactRow } from "./CompactRow";
import { WokeMarker } from "./WokeMarker";
import { ShortcutHint, useSidebarThreadSplit, useThreadActions } from "./bb-sdk";
import {
  useId,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type PointerEventHandler,
} from "react";
import { useSidebarThreadShortcut, type PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { ChildThreadBadge, ChildThreadList } from "./ChildThreadList";
import { Icon } from "./components/Icon";
import { Tooltip } from "./components/Tooltip";
import { ThreadDetailsTooltip } from "./ThreadDetailsTooltip";
import { ThreadFilingActions } from "./ThreadFilingActions";
import { cn } from "./lib/utils";
import { DRAG_LIFT_CLASS } from "./drag-preview";
import { rowKeyshortcuts } from "./lib/keyshortcuts";
import { RowContextMenu } from "./RowContextMenu";
import { ProviderGlyph } from "./ProviderGlyph";
import { STATUS_SLOT_CLASS, StatusOrTime, useWorkingForDisplay } from "./StatusSlot";
import { CompactStatusOrTime } from "./StatusGlyph";
import { threadDisplayTitle } from "./inbox";
import { InlineThreadTitle } from "./InlineThreadTitle";
import { isWorkingTree } from "./working-tree";
import { ProjectFavicon, ProjectStripe } from "./ProjectFavicon";
import { useProjectColor } from "./ProjectColors";
import { useInboxEnvironment, useInboxActions, useInboxActivity } from "./InboxContext";
import { DEFAULT_SIDEBAR_SETTINGS } from "./sidebar-settings";
import { useRowStatusRuns } from "./useLifecycle";
import { projectIconUrl as iconUrl } from "./project-icons";

export interface ThreadReorderControls {
  disabled: boolean;
  isDragging: boolean;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
}

/**
 * Two-line card, or one line in compact mode. Project groups omit the project
 * line. Status follows manual reorders. Controls sit above a full-bleed anchor
 * for valid markup and keyboard access.
 */
export function ThreadCard({
  thread,
  showProject = true,
  projectIconOnly = false,
  isActive,
  isWoke,
  canPark,
  canSnooze,
  childThreads,
  childrenExpanded,
  reorder,
  compactWhenWorking = false,
  compactAlways = false,
  onRenamingChange,
}: {
  thread: PluginSidebarThread;
  /** False when a group header already names the project. */
  showProject?: boolean;
  projectIconOnly?: boolean;
  isActive: boolean;
  /** A snooze ended and has not yet been acknowledged. */
  isWoke: boolean;
  /** False while the thread is working or blocked on the user. */
  canPark: boolean;
  canSnooze: boolean;
  childThreads: readonly PluginSidebarThread[];
  childrenExpanded: boolean;
  reorder?: ThreadReorderControls;
  /** Experimental: show threads with live work as a single line. */
  compactWhenWorking?: boolean;
  /** Compact all threads: one line regardless of work, woke state included. */
  compactAlways?: boolean;
  onRenamingChange?: (editing: boolean) => void;
}) {
  const [pin] = useThreadActions(thread, { keys: ["bb--core/pin"] });
  const {
    providerById,
    projectNameById,
    snoozePresets,
    childrenByParentId: childrenByParent,
    sidebarSettings,
  } = useInboxEnvironment();
  const { onNavigate, settleThread, snoozeThread, acknowledgeWake, toggleChildExpansion } = useInboxActions();
  const { now } = useInboxActivity();
  const provider = providerById.get(thread.providerId) ?? null;
  const projectName = projectNameById.get(thread.projectId) ?? null;
  const projectIconUrl = iconUrl(thread.projectId);
  const showRunningChildrenWhenCollapsed =
    sidebarSettings?.showRunningChildrenWhenCollapsed ?? DEFAULT_SIDEBAR_SETTINGS.showRunningChildrenWhenCollapsed;
  const onSettle = () => settleThread(thread);
  const onSnooze = (until: number) => snoozeThread(thread, until);
  const onAcknowledgeWake = () => acknowledgeWake(thread.id);
  const onToggleChildren = () => toggleChildExpansion(thread.id);
  const shortcut = useSidebarThreadShortcut(thread.id);
  const { splitProps, layout } = useSidebarThreadSplit(thread.id);
  const rowRef = useRef<HTMLLIElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry?.isIntersecting ?? false);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);
  const [isRenaming, setIsRenaming] = useState(false);
  useLayoutEffect(() => {
    return () => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !rowRef.current?.contains(focused)) return;
      const sidebar = rowRef.current.closest<HTMLElement>("[data-shelves-root]");
      const childId = focused.getAttribute("data-child-thread-id");
      const control = focused.getAttribute("data-thread-control");
      // Moving a row between shelf trees unmounts its focused control.
      queueMicrotask(() => {
        if (!sidebar?.isConnected || document.activeElement !== document.body) return;
        const replacement = [...sidebar.querySelectorAll<HTMLAnchorElement>("a[data-sidebar-thread-id]")].find(
          (link) => link.dataset.sidebarThreadId === thread.id,
        );
        const row = replacement?.closest("li");
        const child =
          childId &&
          [...(row?.querySelectorAll<HTMLElement>("[data-child-thread-id]") ?? [])].find(
            (item) => item.dataset.childThreadId === childId,
          );
        const matchingControl =
          control &&
          [...(row?.querySelectorAll<HTMLElement>("[data-thread-control]") ?? [])].find(
            (item) => item.dataset.threadControl === control,
          );
        (child || matchingControl || replacement)?.focus();
      });
    };
  }, [thread.id]);
  const compactAtRenameStart = useRef(false);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const holdParkActions = isSnoozeOpen;
  const childListId = useId();
  // Keep busy trees compact until a failure, question, or wake needs attention.
  const working = useWorkingForDisplay();
  const naturalCompact =
    compactAlways || (compactWhenWorking && !isWoke && isWorkingTree(thread, childThreads, childrenByParent, working));
  const compact = isRenaming ? compactAtRenameStart.current : naturalCompact;
  const stripeView = compact ? "collapsed" : "full";
  const projectColor = useProjectColor(thread.projectId);
  const changeRenaming = (editing: boolean) => {
    if (editing) compactAtRenameStart.current = compact;
    setIsRenaming(editing);
    onRenamingChange?.(editing);
  };
  // Collapsed cards leave their child rows behind the expansion badge.
  const showChildrenWhenCollapsed = showRunningChildrenWhenCollapsed && !compact;
  const emphasis = isWoke ? "woke" : thread.isUnread ? "unread" : thread.indicator === "none" ? "read-idle" : "active";
  const rowRuns = useRowStatusRuns(thread.id);
  const canShelve = !rowRuns && canPark;
  const snoozable = !rowRuns && canSnooze;
  const showParkActions = canShelve || snoozable;

  const unpinButton = thread.isPinned ? (
    <Tooltip label="Unpin thread">
      <button
        type="button"
        aria-label={`Unpin ${threadDisplayTitle(thread)}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void pin?.action.run();
        }}
        className={cn(
          "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
          "pointer-events-auto",
          (compact || !showParkActions) &&
            "opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover/card:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100",
        )}
      >
        <Icon name="PinOff" className="size-3.5" />
      </button>
    </Tooltip>
  ) : null;

  const titleLine = (
    <div
      data-row-emphasis={emphasis}
      className={cn(
        // T3 Code's 14px title on a 20px line; bb's text-sm is 13px.
        "pointer-events-none relative min-w-0 flex-1 truncate text-[0.875rem]/5",
        showProject ? "mt-1" : "min-w-0 flex-1",
        showProject && thread.host && "col-span-2",
        isRenaming && "pointer-events-auto",
        // T3 Code's card: the title keeps the foreground over its project and
        // machine, and a read idle title recedes by weight alone. bb's dark
        // foreground is too dim to also drop it to T3's 75%.
        showProject
          ? cn("text-foreground", emphasis !== "read-idle" && "font-medium")
          : cn(
              emphasis === "read-idle" ? "text-muted-foreground" : "text-foreground",
              (emphasis === "unread" || emphasis === "woke") && "font-medium",
            ),
      )}
    >
      <InlineThreadTitle thread={thread} editing={isRenaming} onEditingChange={changeRenaming} />
    </div>
  );

  return (
    <RowContextMenu
      thread={thread}
      canSnooze={snoozable}
      canArchive={canPark}
      snoozePresets={snoozePresets}
      onSnooze={onSnooze}
      onSettle={canShelve ? onSettle : undefined}
      onRename={() => changeRenaming(true)}
    >
      <li
        ref={rowRef}
        className={cn(
          "list-none",
          // The row stays in the flow — the list reorders around it — but it
          // is drawn over its neighbours rather than under them, so its shadow
          // and ring are not clipped by the rows it sits between.
          reorder?.isDragging && "relative z-20",
        )}
      >
        <div data-drag-visual="">
          {compact ? (
            <CompactRow
              thread={thread}
              tone="normal"
              showProject={showProject}
              projectIconOnly={projectIconOnly}
              projectName={projectName}
              projectIconUrl={projectIconUrl}
              projectColor={projectColor}
              label={threadDisplayTitle(thread)}
              isActive={isActive}
              isSplitOpen={layout !== null}
              isDragging={!!reorder?.isDragging}
              isRenaming={isRenaming}
              onRenamingChange={changeRenaming}
              onOpen={() => {
                if (isWoke) onAcknowledgeWake();
                onNavigate();
              }}
              rowProps={{ "data-parent-card": "" }}
              linkProps={{
                draggable: false,
                "aria-keyshortcuts": rowKeyshortcuts(shortcut?.ariaKeyshortcuts, !!reorder),
                onPointerDown: (event) => {
                  splitProps.onPointerDown?.(event);
                  reorder?.onPointerDown(event);
                },
                onKeyDown: reorder?.onKeyDown,
                // Vertical panning stays with the scroller during reordering.
                className: cn(
                  "absolute inset-0 touch-pan-y rounded-md",
                  reorder && !reorder.disabled ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                ),
              }}
              trailing={
                <span className="pointer-events-none relative flex shrink-0 items-center gap-1.5">
                  {childThreads.length > 0 ? (
                    <ChildThreadBadge
                      threads={childThreads}
                      childrenByParent={childrenByParent}
                      expanded={childrenExpanded}
                      controls={childListId}
                      onToggle={onToggleChildren}
                    />
                  ) : null}
                  {shortcut ? (
                    <ShortcutHint shortcut={shortcut} />
                  ) : (
                    <>
                      {unpinButton}
                      {isWoke ? <WokeMarker onDismiss={onAcknowledgeWake} /> : null}
                      <CompactStatusOrTime thread={thread} now={now} />
                    </>
                  )}
                  {showParkActions ? (
                    <span
                      className={cn(
                        "pointer-events-auto items-center gap-0.5 group-hover/card:flex group-focus-within/card:flex [@media(hover:none)]:flex",
                        holdParkActions ? "flex" : "hidden",
                      )}
                    >
                      <ThreadFilingActions
                        snoozePresets={snoozePresets}
                        onOpenChange={setIsSnoozeOpen}
                        onSnooze={snoozable ? onSnooze : undefined}
                        onSettle={canShelve ? onSettle : undefined}
                      />
                    </span>
                  ) : null}
                  <ProviderGlyph providerId={thread.providerId} provider={provider} />
                </span>
              }
            />
          ) : (
            <div
              data-parent-card=""
              className={cn(
                "group/card relative rounded-md px-2.5 py-2 transition-colors duration-150 ease-out motion-reduce:transition-none",
                isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                // A thread open in another pane gets a weaker tint than the active
                // row, so the two states stay distinguishable.
                !isActive && layout !== null && "bg-sidebar-accent/30",
                reorder?.isDragging && DRAG_LIFT_CLASS,
              )}
            >
              {showProject && projectName ? <ProjectStripe projectId={thread.projectId} view={stripeView} /> : null}
              <ThreadDetailsTooltip thread={thread} disabled={isRenaming || !!reorder?.isDragging}>
                <a
                  // Both attributes, or bb's nine thread shortcuts stop finding rows.
                  data-sidebar-thread-shortcut-target=""
                  data-sidebar-thread-id={thread.id}
                  href={thread.href}
                  aria-label={threadDisplayTitle(thread)}
                  aria-current={isActive ? "page" : undefined}
                  draggable={false}
                  aria-keyshortcuts={rowKeyshortcuts(shortcut?.ariaKeyshortcuts, !!reorder)}
                  onPointerDown={(event) => {
                    splitProps.onPointerDown?.(event);
                    reorder?.onPointerDown(event);
                  }}
                  onKeyDown={reorder?.onKeyDown}
                  onClick={(event) => {
                    if (isRenaming || event.detail > 1) {
                      event.preventDefault();
                      return;
                    }
                    if (isWoke) onAcknowledgeWake();
                    onNavigate();
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    changeRenaming(true);
                  }}
                  className={cn(
                    // Vertical panning stays with the scroller; this row never
                    // claims a touch gesture for reordering.
                    "absolute inset-0 touch-pan-y rounded-md",
                    reorder && !reorder.disabled ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  )}
                />
              </ThreadDetailsTooltip>
              <div className="pointer-events-none relative flex h-5 min-w-0 items-center gap-1.5">
                {showProject ? (
                  <span
                    data-thread-project=""
                    className={cn("flex min-w-0 flex-1 items-center gap-1.5 text-xs", SECONDARY_LABEL_CLASS)}
                  >
                    {projectName ? (
                      <ProjectFavicon
                        projectId={thread.projectId}
                        src={projectIconUrl}
                        name={projectName}
                        className="size-4"
                      />
                    ) : null}
                    <span
                      style={projectColor}
                      className={cn("min-w-0 truncate", projectColor && "shelves-project-name")}
                    >
                      {projectName ?? " "}
                    </span>
                  </span>
                ) : (
                  titleLine
                )}
                {/* Show bb's thread shortcut in place of the status while the modifier is held. */}
                {shortcut ? (
                  <span className={cn(STATUS_SLOT_CLASS, "w-auto")}>
                    <ShortcutHint shortcut={shortcut} />
                  </span>
                ) : isWoke ? (
                  <span className={cn(STATUS_SLOT_CLASS, "w-auto gap-1.5")}>
                    {unpinButton}
                    <WokeMarker onDismiss={onAcknowledgeWake} />
                    <StatusOrTime thread={thread} now={now} />
                    <ThreadFilingActions
                      snoozePresets={snoozePresets}
                      onOpenChange={setIsSnoozeOpen}
                      onSnooze={snoozable ? onSnooze : undefined}
                      onSettle={canShelve ? onSettle : undefined}
                    />
                  </span>
                ) : (
                  <span
                    className={cn(
                      STATUS_SLOT_CLASS,
                      "group/status-slot pointer-events-auto relative h-5",
                      showParkActions && "min-w-24",
                      showParkActions && "[@media(hover:none)]:w-auto [@media(hover:none)]:gap-1.5",
                      !showParkActions && "w-auto min-w-20",
                      !showProject && "w-auto min-w-0",
                      !showProject &&
                        showParkActions &&
                        "[@media(hover:hover)]:group-hover/card:min-w-24 has-[:focus-visible]:min-w-24",
                      !showProject && holdParkActions && "min-w-24",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-end gap-0.5 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                        showParkActions &&
                          "[@media(hover:hover)]:group-hover/card:opacity-0 [@media(hover:hover)]:group-has-[:focus-visible]/status-slot:opacity-0 [@media(hover:none)]:static [@media(hover:none)]:opacity-100",
                        showParkActions && showProject && "absolute inset-y-0 right-0",
                        holdParkActions && "opacity-0 [@media(hover:none)]:opacity-100",
                      )}
                    >
                      {!showParkActions ? unpinButton : null}
                      <StatusOrTime thread={thread} now={now} />
                    </span>
                    {showParkActions ? (
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 ease-out has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100 group-hover/card:pointer-events-auto group-hover/card:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 motion-reduce:transition-none",
                          holdParkActions && "pointer-events-auto opacity-100",
                        )}
                      >
                        {unpinButton}
                        <ThreadFilingActions
                          snoozePresets={snoozePresets}
                          onOpenChange={setIsSnoozeOpen}
                          onSnooze={snoozable ? onSnooze : undefined}
                          onSettle={canShelve ? onSettle : undefined}
                        />
                      </span>
                    ) : null}
                  </span>
                )}
              </div>
              {/* T3 Code's card: the title spans its own row and the machine leads the
                  metadata under it. Without a machine the two share one row. The title
                  keeps its place in the tree either way, so a rename survives. */}
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5 gap-y-0.5">
                {showProject ? titleLine : null}
                {thread.host ? <ThreadMachine host={thread.host} /> : null}
                <div
                  className={cn(
                    "pointer-events-none relative col-start-2 flex shrink-0 items-center gap-1.5 text-2xs text-muted-foreground",
                  )}
                >
                  {childThreads.length > 0 ? (
                    <ChildThreadBadge
                      threads={childThreads}
                      childrenByParent={childrenByParent}
                      expanded={childrenExpanded}
                      controls={childListId}
                      onToggle={onToggleChildren}
                    />
                  ) : null}
                  {thread.activity.workflows > 0 ? (
                    <ActivityCount label="workflows" count={thread.activity.workflows} />
                  ) : null}
                  {thread.activity.backgroundAgents > 0 ? (
                    <ActivityCount label="background agents" count={thread.activity.backgroundAgents} />
                  ) : null}
                  {isVisible ? <ThreadPullRequest environmentId={thread.environment?.id ?? null} /> : null}
                  <ProviderGlyph providerId={thread.providerId} provider={provider} />
                </div>
              </div>
            </div>
          )}
          {childThreads.length > 0 ? (
            <ChildThreadList
              id={childListId}
              threads={childThreads}
              expanded={childrenExpanded}
              showRunningChildrenWhenCollapsed={showChildrenWhenCollapsed}
              parentProjectId={thread.projectId}
            />
          ) : null}
        </div>
      </li>
    </RowContextMenu>
  );
}

function ActivityCount({ label, count }: { label: string; count: number }) {
  return (
    <span
      aria-label={`${count} ${label}`}
      className="shrink-0 rounded bg-muted px-1 font-mono text-2xs text-muted-foreground"
    >
      {count}
    </span>
  );
}
