import type { RepoIndex } from "../repo-index/build.js";
import { decayWeight } from "./decay.js";

export type AuthorKnowledge = {
  email: string; // stable identity of a person
  author: string; // most recent name seen for this email
  knowledge: number; // Σ lines × 0.5^(age_months / half_life)
};

// Knowledge per author of a file, highest first. Each commit is weighted by the
// lines it touched, discounted by its age (half-life).
export function fileOwnership(
  index: RepoIndex,
  path: string,
  now: Date,
  opts: { halfLifeMonths?: number } = {},
): AuthorKnowledge[] {
  const commits = index.byFile.get(path) ?? [];

  if (commits.length === 0) {
    return [];
  }

  const knowledgeByAuthor = new Map<
    string,
    { author: string; knowledge: number }
  >();

  for (const commit of commits) {
    const change = commit.files.find((file) => file.path === path);

    const lines = change ? change.added + change.removed : 0;

    const weight = lines * decayWeight(commit.date, now, opts.halfLifeMonths);

    const author = knowledgeByAuthor.get(commit.email) ?? {
      author: commit.author,
      knowledge: 0,
    };

    author.knowledge += weight;

    knowledgeByAuthor.set(commit.email, author);
  }

  return [...knowledgeByAuthor]
    .map(([email, data]) => ({
      email,
      author: data.author,
      knowledge: data.knowledge,
    }))
    .sort((a, b) => b.knowledge - a.knowledge);
}
