import type { CoupledFile } from "../analysis/coupling.js";

// Single source of the coupling format ("100% (3x) path"), without indentation:
// each caller adds its own indent.
export function coupledLine(f: CoupledFile): string {
  return `${Math.round(f.strength * 100)}% (${f.coChanges}x) ${f.path}`;
}
