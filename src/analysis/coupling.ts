import type { RepoIndex } from "../repo-index/build.js";

export type CoupledFile = {
  path: string;
  strength: number; // co-changes / the target's changes, tsunamis excluded
  coChanges: number; // how many times they changed together (the "support")
};

// A commit larger than this is a tsunami (prettier, mass rename, merge): it
// creates false coupling between everything.
const MAX_COMMIT_FILES = 30;
const MIN_CO_CHANGES = 2;

export function coupledFiles(
  index: RepoIndex,
  target: string,
  opts: { maxCommitFiles?: number; minCoChanges?: number } = {},
): CoupledFile[] {
  const { maxCommitFiles = MAX_COMMIT_FILES, minCoChanges = MIN_CO_CHANGES } =
    opts;

  const targetCommits = (index.byFile.get(target) ?? []).filter(
    (commit) => commit.files.length <= maxCommitFiles,
  );

  const targetChanges = targetCommits.length;

  if (targetChanges === 0) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const commit of targetCommits) {
    for (const path of commit.files) {
      if (path === target) {
        continue;
      }

      const count = counts.get(path) ?? 0;

      counts.set(path, count + 1);
    }
  }

  return [...counts]
    .map(([path, co]) => ({
      path,
      coChanges: co,
      strength: co / targetChanges,
    }))
    .filter((file) => file.coChanges >= minCoChanges)
    .sort((a, b) => b.strength - a.strength);
}
