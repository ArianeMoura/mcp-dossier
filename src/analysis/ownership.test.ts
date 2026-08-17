import { describe, it, expect } from "vitest";

import { fileOwnership } from "./ownership.js";
import { buildIndex } from "../repo-index/build.js";
import type { Commit } from "../git/commits.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const MONTH = 30 * 24 * 60 * 60 * 1000;
const monthsAgo = (n: number) => new Date(NOW.getTime() - n * MONTH);

function commit(email: string, date: Date, path = "F"): Commit {
  return {
    hash: email + date.getTime(),
    author: email.split("@")[0]!,
    email,
    date,
    subject: "",
    files: [path],
  };
}

const bia = commit("bia@x", monthsAgo(0));
const ana = commit("ana@x", monthsAgo(12));
const index = buildIndex([bia, ana]);

// What the caller fetches with readLineCounts: hash → lines changed in F.
const lines = new Map([
  [bia.hash, 30],
  [ana.hash, 100],
]);

describe("fileOwnership", () => {
  it("a commit today weighs 1; an old commit decays by half-life", () => {
    const r = fileOwnership(index, "F", NOW, { lines });
    expect(r.find((x) => x.email === "bia@x")?.knowledge).toBeCloseTo(30); // 30 × 0.5^0
    expect(r.find((x) => x.email === "ana@x")?.knowledge).toBeCloseTo(25); // 100 × 0.5^(12/6)
  });

  it("ranks by knowledge: recency beats volume", () => {
    expect(fileOwnership(index, "F", NOW, { lines })[0]!.email).toBe("bia@x");
  });

  it("sums an author's multiple commits", () => {
    const a = commit("ana@x", monthsAgo(0), "F");
    const b = { ...commit("ana@x", monthsAgo(0), "F"), hash: "second" };
    const idx = buildIndex([a, b]);
    const r = fileOwnership(idx, "F", NOW, {
      lines: new Map([
        [a.hash, 10],
        [b.hash, 5],
      ]),
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.knowledge).toBeCloseTo(15);
  });

  it("a commit missing from the line counts weighs nothing", () => {
    const r = fileOwnership(index, "F", NOW, {
      lines: new Map([[bia.hash, 30]]),
    });
    expect(r.find((x) => x.email === "ana@x")?.knowledge).toBe(0);
  });

  it("without line counts, each commit counts once", () => {
    const r = fileOwnership(index, "F", NOW);
    expect(r.find((x) => x.email === "bia@x")?.knowledge).toBeCloseTo(1);
    expect(r.find((x) => x.email === "ana@x")?.knowledge).toBeCloseTo(0.25);
  });

  it("a file nobody touched → []", () => {
    expect(fileOwnership(index, "does/not/exist", NOW, { lines })).toEqual([]);
  });
});
