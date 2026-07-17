import type { RepoIndex } from "../index/build.js";

export type CoupledFile = {
  path: string;
  strength: number; // co-mudanças / mudanças do alvo (direcional)
  coChanges: number; // quantas vezes mudaram juntos (o "support")
};

// Commit acima deste tamanho é tsunami (prettier, rename em massa, merge): gera
// acoplamento falso entre tudo. Limiar heurístico, documentado como limitação.
const MAX_COMMIT_FILES = 30;
// Par visto menos que isto é ruído, não sinal.
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
    for (const file of commit.files) {
      if (file.path === target) {
        continue;
      }

      const count = counts.get(file.path) ?? 0;

      counts.set(file.path, count + 1);
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
