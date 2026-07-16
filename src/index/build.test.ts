import { describe, it, expect } from "vitest";

import { buildIndex } from "./build.js";
import type { Commit } from "../git/commits.js";

/** Monta um Commit de mentira tocando os arquivos dados. */
function commit(hash: string, paths: string[]): Commit {
  return {
    hash,
    author: "Autor",
    email: "autor@exemplo.com",
    date: new Date("2026-01-01T00:00:00.000Z"),
    subject: "commit " + hash,
    files: paths.map((path) => ({ path, added: 1, removed: 0 })),
  };
}

// A tocou auth.ts + auth.test.ts; B tocou auth.ts + ui.ts
const commits: Commit[] = [
  commit("A", ["src/auth.ts", "src/auth.test.ts"]),
  commit("B", ["src/auth.ts", "src/ui.ts"]),
];

describe("buildIndex", () => {
  it("preserva a lista de commits", () => {
    expect(buildIndex(commits).commits).toHaveLength(2);
  });

  it("byFile é um Map", () => {
    expect(buildIndex(commits).byFile).toBeInstanceOf(Map);
  });

  it("mapeia um arquivo para TODOS os commits que o tocaram, na ordem", () => {
    const auth = buildIndex(commits).byFile.get("src/auth.ts");
    expect(auth?.map((c) => c.hash)).toEqual(["A", "B"]);
  });

  it("arquivo tocado por um só commit aparece uma vez", () => {
    const ui = buildIndex(commits).byFile.get("src/ui.ts");
    expect(ui?.map((c) => c.hash)).toEqual(["B"]);
  });

  it("arquivo que ninguém tocou devolve undefined", () => {
    expect(buildIndex(commits).byFile.get("nao/existe.ts")).toBeUndefined();
  });

  it("lista vazia de commits → índice vazio", () => {
    const idx = buildIndex([]);
    expect(idx.commits).toEqual([]);
    expect(idx.byFile.size).toBe(0);
  });
});
