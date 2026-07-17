import type { RepoIndex } from "../index/build.js";
import { decayWeight } from "./decay.js";

// Camada 3: ownership com decaimento por recência. Puro (recebe `now`).

export type AuthorKnowledge = {
  email: string; // identidade estável da pessoa
  author: string; // nome mais recente visto para esse email
  knowledge: number; // Σ linhas × 0.5^(idade_meses / meia-vida)
};

// Conhecimento por autor de um arquivo, do maior para o menor. Cada commit
// pesa pelas linhas tocadas, descontadas pela idade (meia-vida).
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
