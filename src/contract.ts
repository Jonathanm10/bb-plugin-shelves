import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  CHILD_THREAD_SORT_FIELDS,
  CHILD_THREAD_SORT_DIRECTIONS,
  CHILD_THREAD_ICON_STYLES,
  PROJECT_COLOR_DISPLAYS,
  THREAD_DISPLAYS,
} from "./sidebar-settings-values";
import { configuredSnoozePresetError } from "./lifecycle";
import { MAX_INACTIVE_AFTER_HOURS, MIN_INACTIVE_AFTER_HOURS } from "./inactive";
import { MAX_AUTO_SETTLE_AFTER_DAYS, MIN_AUTO_SETTLE_AFTER_DAYS } from "./auto-settle";
export { SIDEBAR_SETTINGS_CHANNEL } from "./realtime-channels";

const threadIdSchema = z.object({ threadId: z.string().trim().min(1) });
/**
 * Legacy acknowledgement shape retained for installed clients. Current actions
 * return an empty summary: filing never stops runtimes or closes terminals.
 */
const reclaimSchema = z.object({
  closedTerminals: z.number().int().nonnegative(),
  keptTerminals: z.number().int().nonnegative(),
  stoppedRuntime: z.boolean(),
});
const orderedThreadIdsSchema = z
  .array(z.string().trim().min(1))
  .max(10_000)
  .superRefine((threadIds, context) => {
    if (new Set(threadIds).size !== threadIds.length) {
      context.addIssue({
        code: "custom",
        message: "Thread ids must be unique",
      });
    }
  });
const threadIdsSchema = orderedThreadIdsSchema.min(1);
export const sidebarSettingsSchema = z
  .object({
    snoozePresets: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine((value) => configuredSnoozePresetError(value) === null, {
        message: "Use one to eight valid snooze shortcuts",
      }),
    inactiveThreadsEnabled: z.boolean(),
    inactiveAfterHours: z.number().int().min(MIN_INACTIVE_AFTER_HOURS).max(MAX_INACTIVE_AFTER_HOURS),
    showRunningChildrenWhenCollapsed: z.boolean(),
    autoSettleInactive: z.boolean(),
    autoSettleAfterDays: z.number().int().min(MIN_AUTO_SETTLE_AFTER_DAYS).max(MAX_AUTO_SETTLE_AFTER_DAYS),
    autoSettleOnMerge: z.boolean(),
    autoSettleKeepPullRequests: z.boolean(),
    childSortField: z.enum(CHILD_THREAD_SORT_FIELDS),
    childSortDirection: z.enum(CHILD_THREAD_SORT_DIRECTIONS),
    childIconStyle: z.enum(CHILD_THREAD_ICON_STYLES),
    threadDisplay: z.enum(THREAD_DISPLAYS),
    compactProjectIconOnly: z.boolean(),
    keepPinnedThreadsFull: z.boolean(),
    keepWokeThreadsFull: z.boolean(),
    compactWorkingThreads: z.boolean(),
    workingShelf: z.boolean(),
    dockShelves: z.boolean(),
    projectColorsEnabled: z.boolean(),
    projectColorDisplay: z.enum(PROJECT_COLOR_DISPLAYS),
  })
  .strict();
export const threadInboxRpcContract = defineRpcContract({
  getThreadExecutionDetails: {
    input: threadIdSchema.strict(),
    output: z
      .object({
        model: z.string(),
        modelDisplayName: z.string().optional(),
        reasoningLabel: z.string().optional(),
        reasoningLevel: z.string(),
      })
      .strict()
      .nullable(),
  },
  setThreadParent: {
    input: threadIdSchema.extend({ parentThreadId: z.string().trim().min(1).nullable() }).strict(),
    output: z.object({ ok: z.boolean(), unpinFailed: z.literal(true).optional() }),
  },
  deleteThread: {
    input: threadIdSchema.extend({ childThreadsConfirmed: z.boolean() }).strict(),
    output: z.object({ ok: z.boolean() }),
  },
  getProjectColors: {
    input: z.object({}).strict(),
    output: z.object({ colors: z.record(z.string(), z.string()) }),
  },
  getSidebarSettings: {
    input: z.object({}).strict(),
    output: sidebarSettingsSchema,
  },
  updateSidebarSettings: {
    // Save only edited fields. Full payloads from older clients remain valid.
    input: sidebarSettingsSchema.partial(),
    output: sidebarSettingsSchema,
  },
  listLifecycle: {
    input: z.object({}),
    output: z.object({
      rows: z.array(
        z.object({
          threadId: z.string(),
          parkedAt: z.number().nullable().optional(),
          settledAt: z.number().nullable(),
          settledOverride: z.enum(["active", "settled"]).nullable().optional(),
          snoozedUntil: z.number().nullable(),
          snoozedAt: z.number().nullable(),
          snoozedPendingInteraction: z.boolean().optional(),
        }),
      ),
    }),
  },
  pin: { input: threadIdSchema, output: z.object({ ok: z.boolean() }) },
  settle: {
    input: threadIdSchema,
    output: z.object({ ok: z.boolean(), reclaim: reclaimSchema, undoToken: z.string().uuid() }),
  },
  park: {
    input: threadIdSchema,
    output: z.object({ ok: z.boolean(), reclaim: reclaimSchema }),
  },
  resume: { input: threadIdSchema, output: z.object({ ok: z.boolean() }) },
  unsettle: {
    input: threadIdSchema.extend({ undoToken: z.string().uuid().optional() }),
    output: z.object({ ok: z.boolean() }),
  },
  snooze: {
    input: z.object({
      threadId: z.string().trim().min(1),
      // Absolute wake time, so a snooze means the same thing on every device.
      snoozedUntil: z.number().int().positive(),
    }),
    output: z.object({ ok: z.boolean(), reclaim: reclaimSchema }),
  },
  unsnooze: { input: threadIdSchema, output: z.object({ ok: z.boolean() }) },
  acknowledgeWake: {
    input: threadIdSchema,
    output: z.object({ ok: z.boolean() }),
  },
  listInboxOrder: {
    input: z.object({}).strict(),
    output: z.object({ inboxThreadIds: z.array(z.string()) }).strict(),
  },
  reorderInbox: {
    input: z.object({ inboxThreadIds: orderedThreadIdsSchema }).strict(),
    output: z.object({ inboxThreadIds: z.array(z.string()) }).strict(),
  },
  evaluateAutoSettle: {
    input: z.object({}).strict(),
    output: z.object({ changedThreadIds: z.array(z.string()) }).strict(),
  },
});
