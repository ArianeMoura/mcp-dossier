import { describe, it, expect } from "vitest";

import { formatCoupled } from "./coupled-files.js";
import type { CoupledFile } from "../analysis/coupling.js";

const results: CoupledFile[] = [
  { path: "src/git/run.ts", strength: 1, coChanges: 3 },
  { path: "src/index/build.ts", strength: 2 / 3, coChanges: 2 },
];

describe("formatCoupled", () => {
  it("menciona o arquivo alvo", () => {
    expect(formatCoupled("src/git/commits.ts", results)).toContain(
      "src/git/commits.ts",
    );
  });

  it("uma linha por resultado, com porcentagem, evidência e caminho", () => {
    const out = formatCoupled("alvo.ts", results);
    expect(out).toContain("100% (3x) src/git/run.ts");
  });

  it("arredonda a porcentagem (0.666… vira 67%)", () => {
    expect(formatCoupled("alvo.ts", results)).toContain(
      "67% (2x) src/index/build.ts",
    );
  });

  it("sem acoplamento: devolve mensagem clara, não texto vazio", () => {
    const out = formatCoupled("alvo.ts", []);
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("alvo.ts");
    expect(out).not.toContain("%");
  });

  it("não desperdiça linhas: uma por resultado além do cabeçalho", () => {
    const linhas = formatCoupled("alvo.ts", results)
      .split("\n")
      .filter((l) => l.trim() !== "");
    expect(linhas).toHaveLength(3); // 1 cabeçalho + 2 resultados
  });
});
