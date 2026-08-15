import type { Commit } from "../git/commits.js";

export type RepoIndex = {
  commits: Commit[]; // newest first, by author date
  byFile: Map<string, Commit[]>;
};

export function buildIndex(commits: Commit[]): RepoIndex {
  // `git log` orders by commit date, but the only date a Commit carries is the
  // author's, and a rebase or cherry-pick makes the two disagree.
  const sorted = [...commits].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  const byFile = new Map<string, Commit[]>();

  for (const commit of sorted) {
    for (const file of commit.files) {
      const fileCommits = byFile.get(file.path) ?? [];
      fileCommits.push(commit);
      byFile.set(file.path, fileCommits);
    }
  }

  return { commits: sorted, byFile };
}
