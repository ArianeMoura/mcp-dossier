import { runGit, readCommits, type GitOptions } from "../git/run.js";
import { buildIndex, type RepoIndex } from "./build.js";

// In-memory cache per process (= per stdio server session). Key: the repo path;
// value: the index and the HEAD SHA it was built at (the invalidation key).
const cache = new Map<string, { head: string; index: RepoIndex }>();

// The HEAD SHA, or "" if the repo has no commits yet. Used as the cache key.
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

  const commits = await readCommits(repoPath, opts);
  const index = buildIndex(commits);
  cache.set(repoPath, { head, index });
  return index;
}
