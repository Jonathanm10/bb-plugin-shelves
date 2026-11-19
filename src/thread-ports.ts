import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { portScanContract } from "./port-scan-contract";

export function createThreadPortActions(bb: BbPluginApi) {
  const host = bb.hosts.experimental_client({ contract: portScanContract });
  const controller = new AbortController();
  bb.onDispose(() => controller.abort());

  return {
    /**
     * Which of `candidates` may still be serving a port: a process listening
     * in its workspace that it owns, or that no thread owns in a workspace
     * only it uses (ownership is read from the process environment, which can
     * fail). One scan per host. A host that cannot be scanned puts all its
     * candidates in the result, because no answer is not "none". A candidate
     * without a workspace path serves nothing.
     */
    async threadsServingPorts(
      candidates: readonly PortThread[],
      everyThread: readonly PortThread[],
    ): Promise<Set<string>> {
      const threadsPerEnvironment = new Map<string, number>();
      for (const { environmentId } of everyThread) {
        if (environmentId)
          threadsPerEnvironment.set(environmentId, (threadsPerEnvironment.get(environmentId) ?? 0) + 1);
      }
      const byHost = new Map<string, PortThread[]>();
      for (const thread of candidates) {
        if (!thread.environmentId || !thread.environmentPath || !thread.environmentHostId) continue;
        byHost.set(thread.environmentHostId, [...(byHost.get(thread.environmentHostId) ?? []), thread]);
      }
      const serving = new Set<string>();
      await Promise.all(
        [...byHost].map(async ([hostId, threads]) => {
          try {
            const roots = [
              ...new Map(
                threads.map((thread) => [
                  thread.environmentId!,
                  { environmentId: thread.environmentId!, path: thread.environmentPath! },
                ]),
              ).values(),
            ];
            const { ports } = await host.call(
              "scan",
              { roots },
              {
                hostId,
                signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
              },
            );
            for (const thread of threads) {
              const servesPort = ports.some(
                (port) =>
                  port.environmentId === thread.environmentId &&
                  port.source === "process" &&
                  (port.ownerThreadId === thread.id ||
                    (port.ownerThreadId === undefined && threadsPerEnvironment.get(thread.environmentId!) === 1)),
              );
              if (servesPort) serving.add(thread.id);
            }
          } catch {
            controller.signal.throwIfAborted();
            for (const thread of threads) serving.add(thread.id);
          }
        }),
      );
      return serving;
    },
  };
}

/** The workspace fields of a bb project-thread row. */
interface PortThread {
  id: string;
  environmentId: string | null;
  environmentPath: string | null;
  environmentHostId: string | null;
}
