import type { Commit } from "../git/commits.js";

/**
 * Camada 2 — o índice. Uma reorganização dos mesmos commits para consulta
 * rápida. NÃO calcula métricas (isso é camada 3); só arruma o dado.
 *
 * `buildIndex` é PURA: recebe Commit[], devolve RepoIndex. Zero git, zero
 * cache, zero I/O — testável com fixtures. A parte impura (rodar o git,
 * memoizar, checar o HEAD) mora no getIndex.
 */
export type RepoIndex = {
  commits: Commit[]; // todos os commits, do mais novo para o mais antigo
  byFile: Map<string, Commit[]>; // caminho do arquivo → commits que o tocaram
};

/**
 * Constrói o índice invertido a partir da lista de commits.
 *
 * Para cada arquivo tocado por um commit, esse commit é acrescentado à
 * lista daquele arquivo em `byFile`. Assim, "quais commits mexeram em X?"
 * vira um `byFile.get(X)` em vez de varrer todos os commits.
 *
 * @param commits  os commits, na ordem em que o git os deu (mais novo 1º)
 * @returns        o índice pronto para consulta
 */
export function buildIndex(commits: Commit[]): RepoIndex {
  const byFile = new Map<string, Commit[]>();

  for (const commit of commits) {
    for (const file of commit.files) {
      const fileCommits = byFile.get(file.path) ?? [];

      fileCommits.push(commit);

      byFile.set(file.path, fileCommits);
    }
  }

  return {
    commits,
    byFile,
  };
}