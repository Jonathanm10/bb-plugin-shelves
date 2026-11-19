import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { threadPullRequestSchema } from "./contract";

export const pullRequestHostContract = defineRpcContract({
  pullRequests: {
    input: z.object({ urls: z.array(z.string().url()).min(1).max(200) }),
    output: z.object({ pullRequests: z.array(threadPullRequestSchema) }),
  },
});
