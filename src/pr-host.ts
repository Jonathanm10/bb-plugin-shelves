import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { experimental_defineHostEntry } from "@get-bb/plugin-sdk/host";
import { pullRequestHostContract } from "./pr-host-contract";
import type { ThreadPullRequest } from "./contract";
import { parseGhPullRequest } from "./pull-requests";

const exec = promisify(execFile);

// GUI-launched daemons often miss the shell PATH where Homebrew installs gh.
const GH_PATH = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean).join(":");

async function viewPullRequests(urls: string[], signal: AbortSignal) {
  const pullRequests: ThreadPullRequest[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, urls.length) }, async () => {
      while (next < urls.length) {
        const url = urls[next++]!;
        try {
          const { stdout } = await exec("gh", ["pr", "view", url, "--json", "number,title,state,isDraft,url"], {
            signal,
            timeout: 10_000,
            env: { ...process.env, PATH: GH_PATH },
          });
          const pullRequest = parseGhPullRequest(stdout);
          // Keyed by the URL the thread printed, even if the repo was renamed.
          if (pullRequest) pullRequests.push({ ...pullRequest, url });
        } catch (error) {
          if (signal.aborted) throw error;
          // Missing gh, no access, or a deleted PR: the caller lists it without status.
        }
      }
    }),
  );
  return { pullRequests };
}

export default experimental_defineHostEntry({
  contract: pullRequestHostContract,
  handlers: {
    async pullRequests({ urls }, { signal }) {
      return viewPullRequests(urls, signal);
    },
  },
});
