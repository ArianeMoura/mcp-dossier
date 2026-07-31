import { runGit, type GitOptions } from "./run.js";

const lines = (out: string) => out.split("\n").filter(Boolean);

// The remote's default branch, kept fully qualified: "main" alone names a local
// branch, which a single-branch clone or a CI checkout doesn't have.
async function originDefaultRef(
  repoPath: string,
  opts: GitOptions,
): Promise<string | null> {
  try {
    const ref = await runGit(
      repoPath,
      ["symbolic-ref", "refs/remotes/origin/HEAD"],
      opts,
    );
    return ref.trim() || null;
  } catch {
    return null;
  }
}

// The base commit: where the current branch diverged from the default branch.
// The remote-tracking refs cover a clone whose origin/HEAD is unset; HEAD is the
// last resort, and the diff then covers only uncommitted work.
async function findBase(repoPath: string, opts: GitOptions): Promise<string> {
  const candidates = [
    await originDefaultRef(repoPath, opts),
    "main",
    "master",
    "origin/main",
    "origin/master",
  ];

  for (const ref of new Set(candidates)) {
    if (!ref) continue;
    try {
      // --end-of-options: the ref comes from repo data, and one starting with
      // `-` would otherwise be parsed as an option.
      return (
        await runGit(
          repoPath,
          ["merge-base", "--end-of-options", "HEAD", ref],
          opts,
        )
      ).trim();
    } catch {
      // branch doesn't exist here; try the next candidate
    }
  }
  return "HEAD";
}

// Files touched by the current change: this branch's commits since the base,
// plus anything not yet committed (working tree and new files).
export async function changedFiles(
  repoPath: string,
  opts: GitOptions = {},
): Promise<string[]> {
  const base = await findBase(repoPath, opts);

  const [diff, untracked] = await Promise.all([
    runGit(repoPath, ["diff", "--name-only", "--end-of-options", base], opts),
    runGit(repoPath, ["ls-files", "--others", "--exclude-standard"], opts),
  ]);

  return [...new Set([...lines(diff), ...lines(untracked)])];
}
