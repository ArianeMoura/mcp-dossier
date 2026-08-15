import type { RepoIndex } from "../repo-index/build.js";

export type AuthorActivity = {
  email: string;
  author: string;
  commits: number;
};

export type RepoBriefing = {
  totalCommits: number;
  fileCount: number;
  firstCommit: Date | null;
  lastCommit: Date | null;
  topAuthors: AuthorActivity[];
};

const MAX_AUTHORS = 5;

export function buildRepoBriefing(index: RepoIndex): RepoBriefing {
  const commits = index.commits;

  const byEmail = new Map<string, AuthorActivity>();
  for (const commit of commits) {
    const activity = byEmail.get(commit.email) ?? {
      email: commit.email,
      author: commit.author,
      commits: 0,
    };
    activity.commits += 1;
    byEmail.set(commit.email, activity);
  }

  const topAuthors = [...byEmail.values()]
    .sort((a, b) => b.commits - a.commits)
    .slice(0, MAX_AUTHORS);

  // commits is newest first.
  const newest = commits[0];
  const oldest = commits[commits.length - 1];

  return {
    totalCommits: commits.length,
    // byFile keys every path ever touched, so deleted files still count.
    fileCount: index.byFile.size,
    firstCommit: oldest?.date ?? null,
    lastCommit: newest?.date ?? null,
    topAuthors,
  };
}
