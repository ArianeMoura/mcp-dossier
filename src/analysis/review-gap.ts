import type { RepoIndex } from "../index/build.js";
import { coupledFiles } from "./coupling.js";

// Camada 3: a lacuna de revisão. Puro — recebe o conjunto de arquivos alterados
// e cruza com o acoplamento histórico. Não fala com git.

export type GapSuggestion = {
  path: string; // arquivo provavelmente esquecido
  strength: number; // acoplamento com o arquivo alterado que o puxou
  coChanges: number;
  relatedTo: string; // qual arquivo que você mexeu sugeriu este
};

// Para cada arquivo alterado, os arquivos que costumam mudar junto e que você
// NÃO tocou. Quando um mesmo esquecido é puxado por vários, fica a maior força.
export function reviewGap(
  index: RepoIndex,
  changed: string[],
  opts: { minStrength?: number } = {},
): GapSuggestion[] {
  const { minStrength = 0 } = opts;

  const changedSet = new Set(changed);

  const suggestions = new Map<string, GapSuggestion>();

  for (const file of changed) {
    const coupled = coupledFiles(index, file);

    for (const c of coupled) {
      if (changedSet.has(c.path)) {
        continue;
      }

      const existing = suggestions.get(c.path);

      if (!existing || c.strength > existing.strength) {
        suggestions.set(c.path, {
          path: c.path,
          strength: c.strength,
          coChanges: c.coChanges,
          relatedTo: file,
        });
      }
    }
  }

  return [...suggestions.values()]
    .filter((suggestion) => suggestion.strength >= minStrength)
    .sort((a, b) => b.strength - a.strength);
}
