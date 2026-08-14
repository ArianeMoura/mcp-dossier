import type { Commit } from "../git/commits.js";

export type RepoIndex = {
  commits: Commit[]; // newest first
  byFile: Map<string, Commit[]>; // file path → commits that touched it
};

// Inverted index: trades "scan every commit" for "byFile.get(path)".
export function buildIndex(commits: Commit[]): RepoIndex {
  const byFile = new Map<string, Commit[]>();

  for (const commit of commits) {
    for (const file of commit.files) {
      const fileCommits = byFile.get(file.path) ?? [];
      fileCommits.push(commit);
      byFile.set(file.path, fileCommits);
    }
  }

  return { commits, byFile };
}
