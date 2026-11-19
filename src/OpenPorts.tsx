import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { UrlLink, useRpc, type PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { bbSidebarRpcContract, OpenPort, PortSnapshot } from "./contract";
import { portsByEnvironment } from "./open-ports";
import { Icon } from "./components/Icon";
import { portBrowserUrl } from "./port-links";
import { usePortLinkHost } from "./PortLinkSettings";
import { useOnDemandLookups } from "./useOnDemandLookups";

const OpenPortsContext = createContext<ReadonlyMap<string, readonly OpenPort[]>>(new Map());
// Separate from the ports, so a consumer that only asks for a rescan or a
// lookup never rerenders when the list changes.
const OpenPortsActionsContext = createContext<{
  /** Looks up a workspace only settled threads use, which the poll skips. */
  lookUp: (environmentId: string | undefined) => void;
}>({ lookUp: () => {} });
// getOpenPorts answers from a 30s server cache, so polling faster only
// fetches the same snapshot again.
const PORT_POLL_INTERVAL_MS = 30_000;
// Mirrors the contract's cap on environment ids per call.
const ENVIRONMENTS_PER_CALL = 500;
/** The workspaces the poll covers, and those only settled threads use; null until the shelves are known. */
export type PortScanScope = { live: readonly string[]; settledOnly: ReadonlySet<string> } | null;

function samePorts(left: ReadonlyMap<string, readonly OpenPort[]>, right: ReadonlyMap<string, readonly OpenPort[]>) {
  if (left.size !== right.size) return false;
  return [...left].every(([environmentId, ports]) => {
    const other = right.get(environmentId);
    return (
      other?.length === ports.length &&
      ports.every((port, index) => {
        const candidate = other[index];
        return (
          Object.keys(port).length === Object.keys(candidate).length &&
          Object.entries(port).every(([key, value]) => candidate[key as keyof OpenPort] === value)
        );
      })
    );
  });
}

const NO_SETTLED_WORKSPACES: ReadonlySet<string> = new Set();

/**
 * Polls the workspaces of live threads every 30s. A workspace only settled
 * threads use is scanned when one of them is looked at, and its ports show
 * until that answer expires. Nothing polls before the shelves are known.
 */
export function OpenPortsProvider({ scope, children }: { scope: PortScanScope; children: ReactNode }) {
  const rpc = useRpc<typeof bbSidebarRpcContract>();
  const [ports, setPorts] = useState<ReadonlyMap<string, readonly OpenPort[]>>(new Map());
  const liveKey = scope === null ? null : scope.live.join("\n");
  const fetchOne = useCallback(
    async (environmentId: string) =>
      portsByEnvironment(await rpc.call("getOpenPorts", { environmentIds: [environmentId] })).get(environmentId) ?? [],
    [rpc],
  );
  const onDemand = useOnDemandLookups<readonly OpenPort[]>(fetchOne, scope?.settledOnly ?? NO_SETTLED_WORKSPACES);
  const { lookUp: lookUpOne } = onDemand;
  const actions = useMemo(
    () => ({
      lookUp: (environmentId: string | undefined) => {
        if (environmentId) lookUpOne(environmentId);
      },
    }),
    [lookUpOne],
  );

  useEffect(() => {
    if (liveKey === null) return;
    const environmentIds = liveKey === "" ? [] : liveKey.split("\n");
    let disposed = false;
    let inFlight = false;
    const isHidden = () => document.visibilityState === "hidden";
    let timer: ReturnType<typeof setTimeout> | undefined;
    function publish(next: ReadonlyMap<string, readonly OpenPort[]>) {
      if (!disposed) setPorts((previous) => (samePorts(previous, next) ? previous : next));
    }
    async function refresh() {
      if (disposed || inFlight || isHidden()) return;
      if (environmentIds.length === 0) {
        publish(new Map());
        return;
      }
      inFlight = true;
      try {
        const groups: PortSnapshot["groups"] = [];
        for (let offset = 0; offset < environmentIds.length; offset += ENVIRONMENTS_PER_CALL) {
          const chunk = environmentIds.slice(offset, offset + ENVIRONMENTS_PER_CALL);
          groups.push(...(await rpc.call("getOpenPorts", { environmentIds: chunk })).groups);
        }
        publish(portsByEnvironment({ groups }));
      } catch {
        // An unavailable scanner must not leave stale indicators behind.
        publish(new Map());
      } finally {
        inFlight = false;
        if (!disposed && !isHidden()) timer = setTimeout(refresh, PORT_POLL_INTERVAL_MS);
      }
    }
    function visibilityChanged() {
      clearTimeout(timer);
      if (!isHidden()) void refresh();
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [rpc, liveKey]);

  const merged = useMemo(
    () =>
      onDemand.values.size === 0
        ? ports
        : new Map([...[...onDemand.values].filter(([, found]) => found.length > 0), ...ports]),
    [onDemand.values, ports],
  );
  return (
    <OpenPortsActionsContext.Provider value={actions}>
      <OpenPortsContext.Provider value={merged}>{children}</OpenPortsContext.Provider>
    </OpenPortsActionsContext.Provider>
  );
}

/** Looks a settled thread's workspace up; a no-op for live workspaces and outside the provider. */
export function useLookUpOpenPorts() {
  return useContext(OpenPortsActionsContext).lookUp;
}

function useThreadPorts(thread: PluginSidebarThread) {
  const byEnvironment = useContext(OpenPortsContext);
  return thread.environment?.id ? byEnvironment.get(thread.environment.id) : undefined;
}

export function OpenPortDetails({ thread }: { thread: PluginSidebarThread }) {
  const ports = useThreadPorts(thread);
  const localHostId = usePortLinkHost();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  if (!ports?.length) return null;
  const scrolls = ports.length > 4;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-xs font-normal leading-4 text-muted-foreground">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((current) => !current);
        }}
        className="pointer-events-auto flex items-center gap-2 rounded-sm text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Icon name="Plug" className="size-3.5 shrink-0" aria-hidden />
        <span>Workspace ports ({ports.length})</span>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} className="ml-auto size-3 shrink-0" aria-hidden />
      </button>
      {expanded ? (
        <div
          id={listId}
          role={scrolls ? "region" : undefined}
          aria-label={scrolls ? "Workspace port list" : undefined}
          tabIndex={scrolls ? 0 : undefined}
          data-port-scroll={scrolls ? "" : undefined}
          className={
            scrolls
              ? "pointer-events-auto flex max-h-[min(12rem,30dvh)] flex-col gap-1.5 overflow-y-auto rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              : "flex flex-col gap-1.5"
          }
        >
          {ports.map((port) => {
            const url = portBrowserUrl(port, thread.host?.id, localHostId);
            return (
              <div key={port.port} className="flex min-w-0 items-start gap-1.5 pl-5 text-xs leading-4">
                <div className="min-w-0 flex-1">
                  <div className="break-words">
                    {url ? (
                      <UrlLink
                        href={url}
                        aria-label={`Open port ${port.port}`}
                        onClick={(event) => event.stopPropagation()}
                        className="pointer-events-auto rounded-sm underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        :{port.port}
                      </UrlLink>
                    ) : (
                      <span>:{port.port}</span>
                    )}{" "}
                    {port.service ?? port.container ?? port.processName ?? "TCP listener"}
                  </div>
                  <div className="break-all text-[11px] text-muted-foreground">
                    {port.address ? `${port.address} · ` : ""}
                    {port.source === "docker"
                      ? `Docker${port.container ? ` · ${port.container}` : ""}`
                      : port.pid
                        ? `PID ${port.pid}`
                        : "TCP"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function OpenPortsIndicator({ thread }: { thread: PluginSidebarThread }) {
  const ports = useThreadPorts(thread);
  if (!ports?.some((port) => port.ownerThreadId === thread.id)) return null;
  return (
    <span
      role="img"
      aria-label="Open ports started by this thread"
      className="pointer-events-none relative flex shrink-0 items-center text-muted-foreground/60"
    >
      <Icon name="Plug" aria-hidden className="size-3" />
    </span>
  );
}
