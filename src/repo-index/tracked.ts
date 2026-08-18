import { runGit, type GitOptions } from "../git/run.js";
import type { RepoIndex } from "./build.js";

// The paths git tracks at HEAD, which is the project. `index.byFile` is the
// history, and the two differ by more than a rounding error: on React 19,392 of
// its 26,594 paths are deleted files, and on express the history holds 902
// paths where the project has 213.
//
// It also settles case. A rename that changed only capitalization leaves both
// spellings in history, and where the filesystem ignores case both resolve to
// the one file.
export function trackedPaths(
  repoPath: string,
  index: RepoIndex,
  opts: GitOptions = {},
): Promise<Set<string>> {
  const hit = index.memo.tracked;
  if (hit) return hit;

  const paths = runGit(repoPath, ["ls-files"], opts).then(
    (out) => new Set(out.split("\n").filter(Boolean)),
  );

  index.memo.tracked = paths;

  paths.catch(() => {
    if (index.memo.tracked === paths) delete index.memo.tracked;
  });

  return paths;
}
