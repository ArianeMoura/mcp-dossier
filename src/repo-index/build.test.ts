import { describe, it, expect } from "vitest";

import { buildIndex } from "./build.js";
import type { Commit } from "../git/commits.js";

function commit(
  hash: string,
  paths: string[],
  date = "2026-01-01T00:00:00.000Z",
): Commit {
  return {
    hash,
    author: "Author",
    email: "author@example.com",
    date: new Date(date),
    subject: "commit " + hash,
    files: paths,
  };
}

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

  it("sorts by author date rather than trusting the order it was given", () => {
    const out = [
      commit("older", ["src/auth.ts"], "2026-01-01T00:00:00.000Z"),
      commit("newer", ["src/auth.ts"], "2026-03-01T00:00:00.000Z"),
    ];

    const index = buildIndex(out);

    expect(index.commits.map((c) => c.hash)).toEqual(["newer", "older"]);
    expect(index.byFile.get("src/auth.ts")?.map((c) => c.hash)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("leaves the caller's array untouched", () => {
    const out = [
      commit("older", ["a.ts"], "2026-01-01T00:00:00.000Z"),
      commit("newer", ["a.ts"], "2026-03-01T00:00:00.000Z"),
    ];

    buildIndex(out);

    expect(out.map((c) => c.hash)).toEqual(["older", "newer"]);
  });

  it("an empty commit list → empty index", () => {
    const idx = buildIndex([]);
    expect(idx.commits).toEqual([]);
    expect(idx.byFile.size).toBe(0);
  });
});
