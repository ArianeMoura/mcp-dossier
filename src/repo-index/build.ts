import type { Commit } from "../git/commits.js";

// Answers derived from the same snapshot, filled on demand. They live on the index so they are discarded with it: a moved HEAD builds a new one.
export type IndexMemo = {
  lineCounts: Map<string, Promise<Map<string, number>>>;
  tracked?: Promise<Set<string>>;
};

export type RepoIndex = {
  commits: Commit[]; // newest first, by author date
  byFile: Map<string, Commit[]>; // every path history ever saw, not the project
  memo: IndexMemo;
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

  return { commits: sorted, byFile, memo: { lineCounts: new Map() } };
}
