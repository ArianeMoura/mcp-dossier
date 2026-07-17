import type { CoupledFile } from "../analysis/coupling.js";

// Fonte única do formato de acoplamento ("100% (3x) caminho"), sem indentação:
// cada chamador põe o próprio recuo.
export function coupledLine(f: CoupledFile): string {
  return `${Math.round(f.strength * 100)}% (${f.coChanges}x) ${f.path}`;
}
