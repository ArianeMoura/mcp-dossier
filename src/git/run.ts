import { spawn } from "node:child_process";

import { getConfig } from "../config.js";
import { LOG_FORMAT, parseLog, type Commit } from "./commits.js";

// Options shared by every git-touching function: an AbortSignal to cancel in
// flight (wired to the MCP request), and a per-call timeout override.
export type GitOptions = { signal?: AbortSignal; timeoutMs?: number };

// Runs git in a repo and returns stdout. The only function that does I/O here.
// spawn (not exec): no buffer ceiling for large output, and no shell — args are
// passed literally, so a path with a space or `;` can't become another command.
// A hung git (credential/GPG prompt, pathological repo) is killed on timeout or
// when the caller aborts, so a request can never block the server forever.
export function runGit(
  repoPath: string,
  args: string[],
  opts: GitOptions = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? getConfig().gitTimeoutMs;

  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repoPath, ...args]);

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const onAbort = () => child.kill("SIGKILL");
    if (opts.signal) {
      if (opts.signal.aborted) child.kill("SIGKILL");
      else opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    const cleanup = () => {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err); // git couldn't be executed (e.g. not installed)
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (timedOut) {
        reject(
          new Error(`git ${args.join(" ")} timed out after ${timeoutMs}ms`),
        );
      } else if (opts.signal?.aborted) {
        reject(new Error(`git ${args.join(" ")} was cancelled`));
      } else if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `git ${args.join(" ")} failed (exit ${code}): ${stderr.trim()}`,
          ),
        );
      }
    });
  });
}

// The history as typed Commit[], newest first.
export async function readCommits(
  repoPath: string,
  opts: GitOptions = {},
): Promise<Commit[]> {
  try {
    const raw = await runGit(
      repoPath,
      ["log", "--numstat", "--pretty=format:" + LOG_FORMAT],
      opts,
    );
    return parseLog(raw);
  } catch (err) {
    // An empty repo makes `git log` fail. Confirm that case in a
    // language-agnostic way: rev-list --count returns "0" and exits 0.
    const count = (
      await runGit(repoPath, ["rev-list", "--all", "--count"], opts)
    ).trim();
    if (count === "0") return [];
    throw err;
  }
}
