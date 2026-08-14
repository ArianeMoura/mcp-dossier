import { describe, it, expect } from "vitest";

import { fileOwnership } from "./ownership.js";
import { buildIndex } from "../repo-index/build.js";
import type { Commit } from "../git/commits.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const MONTH = 30 * 24 * 60 * 60 * 1000;
const monthsAgo = (n: number) => new Date(NOW.getTime() - n * MONTH);

function commit(
  email: string,
  date: Date,
  added: number,
  removed = 0,
  path = "F",
): Commit {
  return {
    hash: email + date.getTime(),
    author: email.split("@")[0]!,
    email,
    date,
    subject: "",
    files: [{ path, added, removed }],
  };
}

describe("fileOwnership", () => {
  // bia: 30 lines today. ana: 100 lines 12 months ago.
  const index = buildIndex([
    commit("bia@x", monthsAgo(0), 30),
    commit("ana@x", monthsAgo(12), 100),
  ]);

  it("a commit today weighs 1; an old commit decays by half-life", () => {
    const r = fileOwnership(index, "F", NOW);
    const bia = r.find((x) => x.email === "bia@x");
    const ana = r.find((x) => x.email === "ana@x");
    expect(bia?.knowledge).toBeCloseTo(30); // 30 × 0.5^0
    expect(ana?.knowledge).toBeCloseTo(25); // 100 × 0.5^(12/6) = 100 × 0.25
  });

  it("ranks by knowledge: recency beats volume", () => {
    expect(fileOwnership(index, "F", NOW)[0]!.email).toBe("bia@x");
  });

  it("counts added + removed lines", () => {
    const idx = buildIndex([commit("ana@x", monthsAgo(0), 10, 5)]);
    expect(fileOwnership(idx, "F", NOW)[0]!.knowledge).toBeCloseTo(15);
  });

  it("sums an author's multiple commits", () => {
    const idx = buildIndex([
      commit("ana@x", monthsAgo(0), 10),
      commit("ana@x", monthsAgo(0), 5),
    ]);
    const r = fileOwnership(idx, "F", NOW);
    expect(r).toHaveLength(1);
    expect(r[0]!.knowledge).toBeCloseTo(15);
  });

  it("a file nobody touched → []", () => {
    expect(fileOwnership(index, "does/not/exist", NOW)).toEqual([]);
  });
});
