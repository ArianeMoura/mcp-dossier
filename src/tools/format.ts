import type { CoupledFile } from "../analysis/coupling.js";

// No indentation: each caller adds its own.
export function coupledLine(f: CoupledFile): string {
  return `${Math.round(f.strength * 100)}% (${f.coChanges}x) ${f.path}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
