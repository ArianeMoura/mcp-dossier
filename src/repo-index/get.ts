import { runGit, readCommits, type GitOptions } from "../git/run.js";
import { buildIndex, type RepoIndex } from "./build.js";

// Per process, so per stdio session. The promise rather than the index: two
// tools called in parallel on a cold cache would otherwise both run the scan.
const cache = new Map<string, { head: string; index: Promise<RepoIndex> }>();

// The HEAD SHA, or "" if the repo has no commits yet.
async function currentHead(
  repoPath: string,
  opts: GitOptions,
): Promise<string> {
  try {
    return (await runGit(repoPath, ["rev-parse", "HEAD"], opts)).trim();
  } catch {
    return "";
  }
}

// Rebuilds only when HEAD moves: `rev-parse` is cheap, the full scan isn't.
export async function getIndex(
  repoPath: string,
  opts: GitOptions = {},
): Promise<RepoIndex> {
  const head = await currentHead(repoPath, opts);

  const cached = cache.get(repoPath);
  if (cached && cached.head === head) {
    return cached.index;
  }

  const index = readCommits(repoPath, opts).then(buildIndex);
  cache.set(repoPath, { head, index });

  // A failed scan must not be served to the next caller, and the entry may have
  // been replaced by a newer HEAD in the meantime.
  index.catch(() => {
    if (cache.get(repoPath)?.index === index) cache.delete(repoPath);
  });

  return index;
}
