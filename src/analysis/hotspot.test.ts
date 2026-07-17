import { describe, it, expect } from "vitest";

import { indentationComplexity, rankHotspots, isNoise } from "./hotspot.js";
import { buildIndex } from "../index/build.js";
import type { Commit } from "../git/commits.js";

const nested = [
  "function f() {", // 0
  "  if (x) {", // 2
  "    return 1;", // 4
  "  }", // 2
  "}", // 0
].join("\n"); // média = (0+2+4+2+0)/5 = 1.6

const flat = ["const a = 1;", "const b = 2;", "return a + b;"].join("\n");

describe("indentationComplexity", () => {
  it("string vazia → 0", () => {
    expect(indentationComplexity("")).toBe(0);
  });

  it("código plano (sem indentação) → 0", () => {
    expect(indentationComplexity(flat)).toBe(0);
  });

  it("calcula a média de indentação das linhas não-vazias", () => {
    expect(indentationComplexity(nested)).toBe(1.6);
  });

  it("ignora linhas em branco (inclusive só com espaços)", () => {
    const withBlanks = ["a", "", "  b", "   ", "c"].join("\n");
    // não-vazias: "a"(0), "  b"(2), "c"(0) → média 2/3
    expect(indentationComplexity(withBlanks)).toBeCloseTo(2 / 3);
  });

  it("código mais aninhado tem complexidade maior", () => {
    const shallow = ["if (x) {", "  a;", "}"].join("\n");
    const deep = [
      "f() {",
      "  g() {",
      "    h() {",
      "      x;",
      "    }",
      "  }",
      "}",
    ].join("\n");
    expect(indentationComplexity(deep)).toBeGreaterThan(
      indentationComplexity(shallow),
    );
  });
});

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

describe("rankHotspots", () => {
  // a: 3 commits; b: 1 commit; c: 2 commits (mas sumiu do disco)
  const index = buildIndex([
    commit("c1", ["a", "b"]),
    commit("c2", ["a", "c"]),
    commit("c3", ["a", "c"]),
  ]);

  const conteudo: Record<string, string | null> = {
    a: ["f() {", "  if (x) {", "    y;", "  }", "}"].join("\n"), // complexidade 1.6
    b: "const flat = 1;", // complexidade 0
    c: null, // deletado
  };
  const readContent = (path: string) => conteudo[path] ?? null;

  it("score = churn × complexidade", () => {
    const a = rankHotspots(index, readContent).find((h) => h.path === "a");
    expect(a).toMatchObject({ churn: 3, complexity: 1.6, score: 3 * 1.6 });
  });

  it("ranqueia do maior score para o menor", () => {
    const ranked = rankHotspots(index, readContent);
    expect(ranked[0].path).toBe("a"); // 4.8 antes de b (0)
  });

  it("pula arquivos que sumiram do disco (readContent null)", () => {
    const paths = rankHotspots(index, readContent).map((h) => h.path);
    expect(paths).not.toContain("c");
  });
});

describe("isNoise", () => {
  it("marca lock files e minificados como ruído", () => {
    expect(isNoise("package-lock.json")).toBe(true);
    expect(isNoise("frontend/yarn.lock")).toBe(true);
    expect(isNoise("dist/app.min.js")).toBe(true);
  });

  it("não marca código de verdade", () => {
    expect(isNoise("src/git/run.ts")).toBe(false);
    expect(isNoise("src/lock.ts")).toBe(false); // "lock" no nome, mas é código
  });
});
