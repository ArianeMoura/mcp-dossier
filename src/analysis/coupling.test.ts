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

// A changed in c1..c4 (4x). B with it in c1,c2,c3 (3x). C with it in c3,c4 (2x).
// The "tsunami" commit touches A + 40 files: it must be ignored.
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
  it("ranks neighbors by coupling strength", () => {
    const r = coupledFiles(index, "A");
    expect(r.map((x) => x.path)).toEqual(["B", "C"]); // B (3/4) before C (2/4)
  });

  it("computes strength = co-changes / target's changes", () => {
    const r = coupledFiles(index, "A");
    expect(r.find((x) => x.path === "B")).toEqual({
      path: "B",
      coChanges: 3,
      strength: 0.75, // 3 of 4
    });
  });

  it("is directional: A→B (0.75) differs from B→A (1.0)", () => {
    const bToA = coupledFiles(index, "B").find((x) => x.path === "A");
    expect(bToA?.strength).toBe(1); // A changed in all 3 of B's changes
  });

  it("does not include the target itself", () => {
    expect(coupledFiles(index, "A").some((x) => x.path === "A")).toBe(false);
  });

  it("ignores the tsunami commit (no coupling to the 40 junk files)", () => {
    const paths = coupledFiles(index, "A").map((x) => x.path);
    expect(paths.some((p) => p.startsWith("junk"))).toBe(false);
  });

  it("drops pairs seen fewer than minCoChanges times", () => {
    // C→? : C changed in c3,c4. B with it only in c3 (1x) → below 2 → out.
    const r = coupledFiles(index, "C");
    expect(r.some((x) => x.path === "B")).toBe(false);
  });

  it("returns [] for a file nobody touched", () => {
    expect(coupledFiles(index, "does/not/exist.ts")).toEqual([]);
  });
});
