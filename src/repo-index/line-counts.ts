import { runGit, type GitOptions } from "../git/run.js";
import { RS, US } from "../git/commits.js";
import type { RepoIndex } from "./build.js";

// Only the hash: the rest of the commit is already in the index.
const HASH_FORMAT = "%x1e%H";

// A ceiling on the memo, so an agent walking a large tree can't grow it without
// bound. Dropping the lot beats evicting cleverly: a rebuild is one git call.
const MAX_MEMO_ENTRIES = 256;

function parse(raw: string, path: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const block of raw.split(RS)) {
    const lines = block.split("\n").filter(Boolean);
    const hash = lines[0]?.split(US)[0];
    if (hash === undefined) continue;

    for (const line of lines.slice(1)) {
      const [added, removed, changed] = line.split("\t");
      if (changed !== path) continue;
      // numstat shows "-" for a binary file, which is 0 lines either way.
      counts.set(hash, (Number(added) || 0) + (Number(removed) || 0));
    }
  }

  return counts;
}

// Lines each commit changed in `path`, for the one analysis that weighs them.
//
// The commits come from the index rather than from a pathspec walk: walking is
// nearly all of the cost, and on React reaching one file's 769 commits that way
// costs 253ms against 45ms for naming them. Naming them also sidesteps the
// history simplification a pathspec turns on, which hides commits the index
// counts and would leave them weighing nothing.
//
// Memoized on the index, so the answers can't outlive the snapshot they were
// read at: a moved HEAD builds a new index and leaves this one to be collected.
export function readLineCounts(
  repoPath: string,
  path: string,
  index: RepoIndex,
  opts: GitOptions = {},
): Promise<Map<string, number>> {
  const commits = index.byFile.get(path);
  if (commits === undefined) return Promise.resolve(new Map<string, number>());

  const memo = index.lineCounts;
  const hit = memo.get(path);
  if (hit) return hit;

  const counts = runGit(
    repoPath,
    [
      "log",
      "--no-walk",
      "--stdin",
      "--numstat",
      "--no-renames",
      "--pretty=format:" + HASH_FORMAT,
      "--",
      path,
    ],
    { ...opts, input: commits.map((commit) => commit.hash).join("\n") },
  ).then((raw) => parse(raw, path));

  if (memo.size >= MAX_MEMO_ENTRIES) memo.clear();
  memo.set(path, counts);

  counts.catch(() => {
    if (memo.get(path) === counts) memo.delete(path);
  });

  return counts;
}
