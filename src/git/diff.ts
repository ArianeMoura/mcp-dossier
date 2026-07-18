import { runGit } from "./run.js";

const lines = (out: string) => out.split("\n").filter(Boolean);

// The remote's default branch (e.g. "main"), or null if origin/HEAD is unset.
async function originDefault(repoPath: string): Promise<string | null> {
  try {
    const ref = await runGit(repoPath, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
    ]);
    return ref.trim().replace("refs/remotes/origin/", "");
  } catch {
    return null;
  }
}

// The base commit: where the current branch diverged from the default branch.
// Falls back to HEAD, so the diff then covers only uncommitted work.
async function findBase(repoPath: string): Promise<string> {
  for (const ref of [await originDefault(repoPath), "main", "master"]) {
    if (!ref) continue;
    try {
      return (await runGit(repoPath, ["merge-base", "HEAD", ref])).trim();
    } catch {
      // branch doesn't exist here; try the next candidate
    }
  }
  return "HEAD";
}

// Files touched by the current change: this branch's commits since the base,
// plus anything not yet committed (working tree and new files).
export async function changedFiles(repoPath: string): Promise<string[]> {
  const base = await findBase(repoPath);

  const [diff, untracked] = await Promise.all([
    runGit(repoPath, ["diff", "--name-only", base]),
    runGit(repoPath, ["ls-files", "--others", "--exclude-standard"]),
  ]);

  return [...new Set([...lines(diff), ...lines(untracked)])];
}
