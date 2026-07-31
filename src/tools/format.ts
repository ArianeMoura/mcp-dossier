import type { CoupledFile } from "../analysis/coupling.js";

// Single source of the coupling format ("100% (3x) path"), without indentation:
// each caller adds its own indent.
export function coupledLine(f: CoupledFile): string {
  return `${Math.round(f.strength * 100)}% (${f.coChanges}x) ${f.path}`;
}

// Regular plurals only; every counted noun in the output is one.
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
