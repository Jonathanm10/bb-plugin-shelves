import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { openPortSchema, threadPullRequestSchema } from "./contract";

const rootSchema = z.object({ environmentId: z.string(), path: z.string().min(1) });
export type PortRoot = z.infer<typeof rootSchema>;
export const portScanContract = defineRpcContract({
  // The plugin's only host entry, so it also runs `gh` where the thread's
  // workspace (and its GitHub sign-in) lives.
  pullRequests: {
    input: z.object({ urls: z.array(z.string().url()).min(1).max(200) }),
    output: z.object({ pullRequests: z.array(threadPullRequestSchema) }),
  },
  scan: {
    input: z.object({ roots: z.array(rootSchema).max(10000) }),
    output: z.object({
      ports: z.array(
        openPortSchema.extend({
          environmentId: z.string(),
        }),
      ),
    }),
  },
});
