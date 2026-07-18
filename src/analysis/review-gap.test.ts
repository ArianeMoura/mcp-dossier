import { describe, it, expect } from "vitest";

import { reviewGap } from "./review-gap.js";
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

// auth.ts (4 changes): auth.test.ts with it 3x (0.75), session.ts 2x (0.5).
const index = buildIndex([
  commit("c1", ["auth.ts", "auth.test.ts"]),
  commit("c2", ["auth.ts", "auth.test.ts"]),
  commit("c3", ["auth.ts", "auth.test.ts", "session.ts"]),
  commit("c4", ["auth.ts", "session.ts"]),
]);

describe("reviewGap", () => {
  it("suggests what changes together and you did not touch", () => {
    const paths = reviewGap(index, ["auth.ts"]).map((g) => g.path);
    expect(paths).toContain("auth.test.ts");
    expect(paths).toContain("session.ts");
  });

  it("SUBTRACTS what you already changed", () => {
    // touched auth.ts AND auth.test.ts → auth.test.ts is not a gap
    const paths = reviewGap(index, ["auth.ts", "auth.test.ts"]).map(
      (g) => g.path,
    );
    expect(paths).not.toContain("auth.test.ts");
    expect(paths).toContain("session.ts");
  });

  it("ranks by coupling strength", () => {
    expect(reviewGap(index, ["auth.ts"])[0].path).toBe("auth.test.ts"); // 0.75 > 0.5
  });

  it("says which changed file surfaced the suggestion", () => {
    const g = reviewGap(index, ["auth.ts"]).find(
      (x) => x.path === "auth.test.ts",
    );
    expect(g?.relatedTo).toBe("auth.ts");
  });

  it("everything already touched → no gaps", () => {
    expect(reviewGap(index, ["auth.ts", "auth.test.ts", "session.ts"])).toEqual(
      [],
    );
  });

  it("a changed file with no coupling history → []", () => {
    expect(reviewGap(index, ["brand-new.ts"])).toEqual([]);
  });

  it("nothing changed → []", () => {
    expect(reviewGap(index, [])).toEqual([]);
  });

  it("same forgotten file surfaced by two: keep the STRONGEST", () => {
    // a.ts→shared 1.0 (2/2); b.ts→shared 0.5 (2/4)
    const idx = buildIndex([
      commit("x1", ["a.ts", "shared.ts"]),
      commit("x2", ["a.ts", "shared.ts"]),
      commit("x3", ["b.ts", "shared.ts"]),
      commit("x4", ["b.ts", "shared.ts"]),
      commit("x5", ["b.ts"]),
      commit("x6", ["b.ts"]),
    ]);
    const g = reviewGap(idx, ["a.ts", "b.ts"]).find(
      (x) => x.path === "shared.ts",
    );
    expect(g?.strength).toBe(1); // the strong link (a.ts), not the weak (b.ts)
    expect(g?.relatedTo).toBe("a.ts");
  });
});
