import type { Commit } from "../git/commits.js";

export type RepoIndex = {
  commits: Commit[]; // do mais novo para o mais antigo
  byFile: Map<string, Commit[]>; // arquivo → commits que o tocaram
};

// Índice invertido: troca "varrer todos os commits" por "byFile.get(arquivo)".
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
