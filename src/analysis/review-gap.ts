import type { RepoIndex } from "../index/build.js";
import { coupledFiles } from "./coupling.js";

export type GapSuggestion = {
  path: string; // the likely-forgotten file
  strength: number; // coupling with the changed file that surfaced it
  coChanges: number;
  relatedTo: string; // which file you changed surfaced this one
};

// For each changed file, the files that usually change with it and that you did
// NOT touch. When several changed files surface the same one, keep the strongest.
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
