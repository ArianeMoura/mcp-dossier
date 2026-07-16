import { describe, it, expect } from "vitest";

import { coupledFiles } from "./coupling.js";
import { buildIndex } from "../index/build.js";
import type { Commit } from "../git/commits.js";

function commit(hash: string, paths: string[]): Commit {
  return {
    hash,
    author: "A",
    email: "a@x.com",
    date: new Date("2026-01-01T00:00:00.000Z"),
    subject: hash,
    files: paths.map((path) => ({ path, added: 1, removed: 0 })),
  };
}

// A mudou em c1..c4 (4x). B junto em c1,c2,c3 (3x). C junto em c3,c4 (2x).
// O commit "tsunami" toca A + 40 arquivos: deve ser ignorado.
const huge = ["A", ...Array.from({ length: 40 }, (_, i) => `junk${i}.ts`)];
const commits: Commit[] = [
  commit("c1", ["A", "B"]),
  commit("c2", ["A", "B"]),
  commit("c3", ["A", "B", "C"]),
  commit("c4", ["A", "C"]),
  commit("tsunami", huge),
];
const index = buildIndex(commits);

describe("coupledFiles", () => {
  it("ranqueia os vizinhos por força de acoplamento", () => {
    const r = coupledFiles(index, "A");
    expect(r.map((x) => x.path)).toEqual(["B", "C"]); // B (3/4) antes de C (2/4)
  });

  it("calcula strength = co-mudanças / mudanças do alvo", () => {
    const r = coupledFiles(index, "A");
    expect(r.find((x) => x.path === "B")).toEqual({
      path: "B",
      coChanges: 3,
      strength: 0.75, // 3 de 4
    });
  });

  it("é direcional: A→B (0.75) difere de B→A (1.0)", () => {
    const bToA = coupledFiles(index, "B").find((x) => x.path === "A");
    expect(bToA?.strength).toBe(1); // A mudou em todas as 3 mudanças de B
  });

  it("não inclui o próprio alvo na lista", () => {
    expect(coupledFiles(index, "A").some((x) => x.path === "A")).toBe(false);
  });

  it("ignora o commit-tsunami (não acopla A aos 40 arquivos de lixo)", () => {
    const paths = coupledFiles(index, "A").map((x) => x.path);
    expect(paths.some((p) => p.startsWith("junk"))).toBe(false);
  });

  it("descarta pares vistos menos que minCoChanges vezes", () => {
    // C→? : C mudou em c3,c4. B junto só em c3 (1x) → abaixo do padrão (2) → fora.
    const r = coupledFiles(index, "C");
    expect(r.some((x) => x.path === "B")).toBe(false);
  });

  it("devolve [] para um arquivo que ninguém tocou", () => {
    expect(coupledFiles(index, "nao/existe.ts")).toEqual([]);
  });
});
