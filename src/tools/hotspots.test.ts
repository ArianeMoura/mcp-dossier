import { describe, it, expect } from "vitest";

import { formatHotspots } from "./hotspots.js";
import type { Hotspot } from "../analysis/hotspot.js";

const spots: Hotspot[] = [
  { path: "src/git/run.ts", churn: 4, complexity: 3.9, score: 15.7 },
  { path: "src/git/commits.ts", churn: 3, complexity: 3.7, score: 11.1 },
];

describe("formatHotspots", () => {
  it("uma linha por hotspot, com score, churn e caminho", () => {
    const out = formatHotspots(spots);
    expect(out).toContain("src/git/run.ts");
    expect(out).toContain("src/git/commits.ts");
  });

  it("mostra o score com uma casa decimal", () => {
    expect(formatHotspots(spots)).toContain("15.7");
  });

  it("mostra o churn como contexto do score", () => {
    expect(formatHotspots(spots)).toContain("4 commits");
  });

  it("lista vazia → mensagem clara, não texto vazio", () => {
    const out = formatHotspots([]);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("undefined");
  });

  it("uma linha por hotspot além do cabeçalho", () => {
    const linhas = formatHotspots(spots)
      .split("\n")
      .filter((l) => l.trim() !== "");
    expect(linhas).toHaveLength(3); // cabeçalho + 2
  });
});
