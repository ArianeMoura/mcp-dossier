import type { Commit } from "../git/commits.js";

export type RepoIndex = {
  commits: Commit[]; // newest first, by author date
  byFile: Map<string, Commit[]>;
  // Per-path line counts, filled on demand by readLineCounts. It lives here so
  // it is discarded with the snapshot it was read at.
  lineCounts: Map<string, Promise<Map<string, number>>>;
};

export function buildIndex(commits: Commit[]): RepoIndex {
  // `git log` orders by commit date, but the only date a Commit carries is the
  // author's, and a rebase or cherry-pick makes the two disagree.
  const sorted = [...commits].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  const byFile = new Map<string, Commit[]>();

  for (const commit of sorted) {
    for (const path of commit.files) {
      const fileCommits = byFile.get(path) ?? [];
      fileCommits.push(commit);
      byFile.set(path, fileCommits);
    }
  }

  return { commits: sorted, byFile, lineCounts: new Map() };
}
