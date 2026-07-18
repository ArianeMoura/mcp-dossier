import { spawn } from "node:child_process";

import { LOG_FORMAT, parseLog, type Commit } from "./commits.js";

// Runs git in a repo and returns stdout. The only function that does I/O here.
// spawn (not exec): no buffer ceiling for large output, and no shell — args are
// passed literally, so a path with a space or `;` can't become another command.
export function runGit(repoPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repoPath, ...args]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject); // git couldn't be executed (e.g. not installed)
    child.on("close", (code) => {
      if (code === 0) {
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
export async function readCommits(repoPath: string): Promise<Commit[]> {
  try {
    const raw = await runGit(repoPath, [
      "log",
      "--numstat",
      "--pretty=format:" + LOG_FORMAT,
    ]);
    return parseLog(raw);
  } catch (err) {
    // An empty repo makes `git log` fail. Confirm that case in a
    // language-agnostic way: rev-list --count returns "0" and exits 0.
    const count = (
      await runGit(repoPath, ["rev-list", "--all", "--count"])
    ).trim();
    if (count === "0") return [];
    throw err;
  }
}
