import { describe, it, expect } from "vitest";

import { buildIndex } from "./build.js";
import type { Commit } from "../git/commits.js";

/** Builds a fake Commit touching the given files. */
function commit(hash: string, paths: string[]): Commit {
  return {
    hash,
    author: "Author",
    email: "author@example.com",
    date: new Date("2026-01-01T00:00:00.000Z"),
    subject: "commit " + hash,
    files: paths.map((path) => ({ path, added: 1, removed: 0 })),
  };
}

// A touched auth.ts + auth.test.ts; B touched auth.ts + ui.ts
const commits: Commit[] = [
  commit("A", ["src/auth.ts", "src/auth.test.ts"]),
  commit("B", ["src/auth.ts", "src/ui.ts"]),
];

describe("buildIndex", () => {
  it("preserves the commit list", () => {
    expect(buildIndex(commits).commits).toHaveLength(2);
  });

  it("byFile is a Map", () => {
    expect(buildIndex(commits).byFile).toBeInstanceOf(Map);
  });

  it("maps a file to ALL commits that touched it, in order", () => {
    const auth = buildIndex(commits).byFile.get("src/auth.ts");
    expect(auth?.map((c) => c.hash)).toEqual(["A", "B"]);
  });

  it("a file touched by a single commit appears once", () => {
    const ui = buildIndex(commits).byFile.get("src/ui.ts");
    expect(ui?.map((c) => c.hash)).toEqual(["B"]);
  });

  it("a file nobody touched returns undefined", () => {
    expect(buildIndex(commits).byFile.get("does/not/exist.ts")).toBeUndefined();
  });

  it("an empty commit list → empty index", () => {
    const idx = buildIndex([]);
    expect(idx.commits).toEqual([]);
    expect(idx.byFile.size).toBe(0);
  });
});
