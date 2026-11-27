import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { useEnvironmentPullRequest } from "./bb-sdk";
import { Icon, type IconName } from "./components/Icon";
import { Tooltip } from "./components/Tooltip";
import { cn } from "./lib/utils";
import { pullRequestStatusLabel, pullRequestToneClass } from "./pull-request-display";

export function ThreadPullRequest({ environmentId }: { environmentId: string | null }) {
  const pullRequest = useEnvironmentPullRequest(environmentId);
  if (!pullRequest) return null;
  return (
    <Tooltip label={`${pullRequest.title}\n${pullRequestStatusLabel(pullRequest)}`} className="whitespace-pre-line">
      <a
        href={pullRequest.url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "pointer-events-auto relative shrink-0 font-mono hover:underline",
          pullRequestToneClass(pullRequest),
        )}
      >
        #{pullRequest.number}
      </a>
    </Tooltip>
  );
}

/** bb reports a machine's name but not its kind, so the name picks the icon. */
export function machineIconName(machineName: string): IconName {
  return /macbook|laptop|notebook/i.test(machineName) ? "Laptop" : "Computer";
}

/**
 * The machine a thread runs on, leading the card's metadata line as in T3
 * Code. It never takes the pointer, so the row stays one link.
 */
export function ThreadMachine({ host }: { host: NonNullable<PluginSidebarThread["host"]> }) {
  return (
    <span
      data-thread-machine=""
      className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground"
    >
      <Icon name={machineIconName(host.name)} aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">
        <span className="sr-only">Machine: </span>
        {host.name}
      </span>
    </span>
  );
}
