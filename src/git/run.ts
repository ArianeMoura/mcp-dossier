import { spawn } from "node:child_process";

import { getConfig } from "../config.js";
import { LOG_FORMAT, parseLog, type Commit } from "./commits.js";

// Cancellation + limits, threaded through every git-touching function.
export type GitOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxOutputChars?: number;
};

// Typed so the MCP layer can name the fix. The message carries the args and
// stays on stderr; only `timeoutMs` is safe to echo, since a ref taken from
// repository data can reach the argument list.
export class GitTimeoutError extends Error {
  constructor(
    readonly timeoutMs: number,
    args: string[],
  ) {
    super(`git ${args.join(" ")} timed out after ${timeoutMs}ms`);
    this.name = "GitTimeoutError";
  }
}

// core.fsmonitor in a repository's own .git/config names an executable git will
// run, so analyzing an untrusted clone would execute it; `-c` outranks every
// config file. quotePath=false keeps non-ASCII paths verbatim instead of
// octal-escaped, so index keys match real files.
const HARDENING = [
  "--no-optional-locks",
  "--no-pager",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.quotePath=false",
];

// A stray GIT_DIR here would silently analyze the wrong repository, and
// GIT_EXTERNAL_DIFF names a command. Dropping GIT_CONFIG_COUNT also neutralizes
// any GIT_CONFIG_KEY_n/VALUE_n pairs.
const UNSET_ENV = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_CEILING_DIRECTORIES",
  "GIT_EXTERNAL_DIFF",
  "GIT_PAGER",
  "GIT_CONFIG",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_COUNT",
];

// Past this the history is too large to index in memory anyway; a clear error
// beats an OOM or a V8 max-string-length crash.
const MAX_OUTPUT_CHARS = 64 * 1024 * 1024;
// stderr only ever feeds an error message, so keep it small.
const MAX_STDERR_CHARS = 8 * 1024;

export function gitEnv(
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, GIT_CONFIG_NOSYSTEM: "1" };
  for (const key of UNSET_ENV) delete env[key];
  return env;
}

// Runs git in a repo and returns stdout. The only function that does I/O here.
// spawn (not exec) and no shell — args are passed literally, so a path with a
// space or `;` can't become another command. A hung, slow, or overly chatty git
// is killed, so it can't block forever or exhaust memory.
export function runGit(
  repoPath: string,
  args: string[],
  opts: GitOptions = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? getConfig().gitTimeoutMs;
  const maxOutputChars = opts.maxOutputChars ?? MAX_OUTPUT_CHARS;

  return new Promise((resolve, reject) => {
    const child = spawn("git", [...HARDENING, "-C", repoPath, ...args], {
      env: gitEnv(),
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let overflowed = false;

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

    // setEncoding, not `+= buffer`: it decodes across chunk boundaries, so a
    // multi-byte character split between reads isn't corrupted.
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      if (overflowed) return;
      if (stdout.length + chunk.length > maxOutputChars) {
        overflowed = true;
        child.kill("SIGKILL");
        return;
      }
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < MAX_STDERR_CHARS) stderr += chunk;
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
      if (overflowed) {
        reject(
          new Error(
            `git ${args.join(" ")} exceeded the ${maxOutputChars}-character output limit`,
          ),
        );
      } else if (timedOut) {
        reject(new GitTimeoutError(timeoutMs, args));
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
    // --no-renames: numstat would otherwise emit `old => new` as one path, a key
    // that matches no file. As delete+add the churn signal is the same.
    const raw = await runGit(
      repoPath,
      ["log", "--numstat", "--no-renames", "--pretty=format:" + LOG_FORMAT],
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
