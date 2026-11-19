import type { ServerContext, ServerHandlers } from "./server-context";
import type { createServerLifecycle } from "./server-lifecycle";
import type { createServerProjectColors } from "./server-project-colors";
import type { createServerSettleActions } from "./server-settle-actions";
import type { createServerSettings } from "./server-settings";
import type { createServerPolicy } from "./server-policy";
import type { createPortDiscovery } from "./port-discovery";
import type { createThreadPullRequests } from "./thread-pull-requests";
import type { createTitleRegenerator } from "./regenerate-title";
import { SIDEBAR_SETTINGS_CHANNEL } from "./contract";
import { INBOX_ORDER_TAG, SIDEBAR_SETTINGS_TAG } from "./rpc-tags";
import { canSnooze } from "./lifecycle";
import { EMPTY_RECLAIM } from "./reclaim";

const CATALOG_TTL_MS = 5 * 60_000;

export function createServerHandlers(
  ctx: ServerContext,
  lifecycle: ReturnType<typeof createServerLifecycle>,
  settings: Awaited<ReturnType<typeof createServerSettings>>,
  policy: ReturnType<typeof createServerPolicy>,
  getOpenPorts: ReturnType<typeof createPortDiscovery>,
  threadPullRequests: ReturnType<typeof createThreadPullRequests>,
  regenerateTitle: ReturnType<typeof createTitleRegenerator>,
  modules: {
    colors: ReturnType<typeof createServerProjectColors>;
    settle: ReturnType<typeof createServerSettleActions>;
  },
) {
  const { readSidebarSettings, writeSidebarSettings } = settings;
  const { evaluatePolicies } = policy;
  const { readOne, readAll, withPinParentChange, write, clear, readInboxOrder, replaceInboxOrder, wakeAncestors } =
    lifecycle;

  // Hover cards resolve model names on every open. Share one catalog request
  // per environment and provider for a few minutes instead of refetching.
  const catalogs = new Map<string, { expiresAt: number; catalog: ReturnType<typeof ctx.bb.sdk.providers.models> }>();
  const providerCatalog = (environmentId: string, providerId: string) => {
    const now = Date.now();
    for (const [key, entry] of catalogs) if (entry.expiresAt <= now) catalogs.delete(key);
    const key = JSON.stringify([environmentId, providerId]);
    const cached = catalogs.get(key);
    if (cached) return cached.catalog;
    const catalog = ctx.bb.sdk.providers.models({ environmentId, providerId });
    catalogs.set(key, { expiresAt: now + CATALOG_TTL_MS, catalog });
    // A failed lookup is retried on the next hover rather than cached.
    catalog.catch(() => {
      if (catalogs.get(key)?.catalog === catalog) catalogs.delete(key);
    });
    return catalog;
  };

  const handlers = {
    getOpenPorts,
    getThreadPullRequests: threadPullRequests.getThreadPullRequests,
    async getThreadExecutionDetails({ threadId }) {
      const options = await ctx.bb.sdk.threads.defaultExecutionOptions({ threadId });
      if (!options) return null;
      const details = { model: options.model, reasoningLevel: options.reasoningLevel };
      try {
        const thread = await ctx.bb.sdk.threads.get({ threadId });
        if (!thread.environmentId) return details;
        const catalog = await providerCatalog(thread.environmentId, thread.providerId);
        const models = [...catalog.models, ...catalog.selectedOnlyModels];
        const model =
          models.find((entry) => entry.id === options.model) ?? models.find((entry) => entry.model === options.model);
        const modelDisplayName = model?.displayName.trim();
        // Effort labels arrived in SDK 0.6.49; older hosts leave them out.
        const reasoningLabel = model?.supportedReasoningEfforts
          ?.find((effort) => effort.reasoningEffort === options.reasoningLevel)
          ?.label?.trim();
        return {
          ...details,
          ...(modelDisplayName ? { modelDisplayName } : {}),
          ...(reasoningLabel ? { reasoningLabel } : {}),
        };
      } catch {
        // Offline hosts and unavailable provider catalogs must still show execution details.
        return details;
      }
    },
    async setThreadParent({ threadId, parentThreadId }) {
      return withPinParentChange(threadId, async () => {
        const thread = await ctx.bb.sdk.threads.get({ threadId });
        if (parentThreadId === thread.parentThreadId) return { ok: true };
        // Validate the parent before unpinning: a rejected update must keep the pin.
        await ctx.bb.sdk.threads.update({ threadId, parentThreadId });
        // A shelved tree keeps a row for every thread in it, so the new parent's
        // row tells whether this move puts unsettled work inside one. If so,
        // return the new ancestors to Active, as new child work does.
        const parentRow = parentThreadId == null ? null : readOne(parentThreadId);
        if (
          parentThreadId != null &&
          parentRow &&
          (parentRow.settledAt !== null || parentRow.parkedAt != null || parentRow.snoozedUntil !== null)
        )
          await wakeAncestors({ id: threadId, parentThreadId });
        if (parentThreadId != null && thread.pinnedAt != null) {
          try {
            await ctx.bb.sdk.threads.unpin({ threadId });
          } catch (error) {
            ctx.bb.log.error(
              `Parent updated but unpinning failed for thread ${threadId}, parent ${parentThreadId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return { ok: true, unpinFailed: true as const };
          }
        }
        return { ok: true };
      });
    },
    async deleteThread({ threadId, childThreadsConfirmed }) {
      // The sidebar shows its own confirmation naming the thread and project,
      // so bb's generic one is skipped. Deletion is recursive; bb refuses it
      // unless the caller confirmed the children too.
      await ctx.bb.sdk.threads.delete({ threadId, childThreadsConfirmed });
      return { ok: true };
    },
    regenerateTitle: ({ threadId }) => regenerateTitle(threadId),
    async getSidebarSettings() {
      return readSidebarSettings();
    },
    async updateSidebarSettings(values) {
      const stored = readSidebarSettings();
      const next = { ...stored, ...values };
      // Keep the legacy switch in step with thread display, both ways.
      if (values.threadDisplay !== undefined) next.compactWorkingThreads = values.threadDisplay !== "full";
      else if (values.compactWorkingThreads !== undefined)
        next.threadDisplay = values.compactWorkingThreads ? "compact-working" : "full";
      writeSidebarSettings(next);
      ctx.bb.rpc.experimental_invalidate([SIDEBAR_SETTINGS_TAG]);
      // The settings page still reloads its drafts on this channel.
      ctx.bb.realtime.publish(SIDEBAR_SETTINGS_CHANNEL, {});
      if (
        next.autoSettleInactive !== stored.autoSettleInactive ||
        next.autoSettleAfterDays !== stored.autoSettleAfterDays ||
        next.autoSettleOnMerge !== stored.autoSettleOnMerge ||
        next.autoSettleKeepPullRequests !== stored.autoSettleKeepPullRequests
      ) {
        policy.settingsChanged();
        void evaluatePolicies().catch((error) => {
          ctx.bb.log.error(
            `Automatic settle evaluation failed after a settings change: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
      return readSidebarSettings();
    },
    async listLifecycle() {
      return { rows: readAll() };
    },
    async pin({ threadId }) {
      return withPinParentChange(threadId, async () => {
        const thread = await ctx.bb.sdk.threads.get({ threadId });
        if (thread.parentThreadId != null) {
          throw new Error("Child threads cannot be pinned");
        }
        // Preserve the previous shelf if the native pin fails.
        await ctx.bb.sdk.threads.pin({ threadId });
        write({
          threadId,
          parkedAt: null,
          settledAt: null,
          settledOverride: "active",
          snoozedUntil: null,
          snoozedAt: null,
        });
        return { ok: true };
      });
    },
    async park({ threadId }) {
      await ctx.bb.sdk.threads.unpin({ threadId });
      write({
        threadId,
        parkedAt: Date.now(),
        settledAt: null,
        settledOverride: null,
        snoozedUntil: null,
        snoozedAt: null,
      });
      return { ok: true, reclaim: { ...EMPTY_RECLAIM } };
    },
    async resume({ threadId }) {
      write({
        threadId,
        settledAt: null,
        settledOverride: "active",
        snoozedUntil: null,
        snoozedAt: null,
      });
      return { ok: true };
    },
    async snooze({ threadId, snoozedUntil }) {
      return lifecycle.withThreadChanges([threadId], async () => {
        const check = async () => {
          const tree = await lifecycle.loadSettleTree(threadId);
          if (tree.some((thread) => !canSnooze(lifecycle.threadSignals(thread)))) {
            throw new Error("Cannot snooze while this thread or its children are working or have queued work");
          }
          return tree;
        };
        const before = await check();
        if (before.find((thread) => thread.id === threadId)?.pinnedAt != null) {
          await ctx.bb.sdk.threads.unpin({ threadId });
        }
        const tree = await check();
        write({
          threadId,
          settledAt: null,
          settledOverride: null,
          snoozedUntil,
          snoozedAt: Date.now(),
          ...(tree.some((thread) => thread.hasPendingInteraction) ? { snoozedPendingInteraction: true } : {}),
        });
        return { ok: true, reclaim: { ...EMPTY_RECLAIM } };
      });
    },
    async unsnooze({ threadId }) {
      clear(threadId);
      return { ok: true };
    },
    async acknowledgeWake({ threadId }) {
      // A woken snooze row is retained only to make the marker durable. Once
      // the user opens or dismisses it, the thread is ordinary active work.
      clear(threadId);
      return { ok: true };
    },
    async listInboxOrder() {
      return { inboxThreadIds: readInboxOrder() };
    },
    async reorderInbox({ inboxThreadIds }) {
      replaceInboxOrder(inboxThreadIds);
      ctx.bb.rpc.experimental_invalidate([INBOX_ORDER_TAG]);
      return { inboxThreadIds: readInboxOrder() };
    },
    async evaluateAutoSettle() {
      return { changedThreadIds: await evaluatePolicies() };
    },
  } satisfies Pick<
    ServerHandlers,
    | "getOpenPorts"
    | "getThreadPullRequests"
    | "getThreadExecutionDetails"
    | "setThreadParent"
    | "deleteThread"
    | "regenerateTitle"
    | "getSidebarSettings"
    | "updateSidebarSettings"
    | "listLifecycle"
    | "pin"
    | "park"
    | "resume"
    | "snooze"
    | "unsnooze"
    | "acknowledgeWake"
    | "listInboxOrder"
    | "reorderInbox"
    | "evaluateAutoSettle"
  >;

  return {
    ...modules.settle.handlers,
    ...modules.colors.handlers,
    ...handlers,
  } satisfies ServerHandlers;
}
