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

// auth.ts (4 mudanças): auth.test.ts junto 3x (0.75), session.ts junto 2x (0.5).
const index = buildIndex([
  commit("c1", ["auth.ts", "auth.test.ts"]),
  commit("c2", ["auth.ts", "auth.test.ts"]),
  commit("c3", ["auth.ts", "auth.test.ts", "session.ts"]),
  commit("c4", ["auth.ts", "session.ts"]),
]);

describe("reviewGap", () => {
  it("sugere o que muda junto e você não tocou", () => {
    const paths = reviewGap(index, ["auth.ts"]).map((g) => g.path);
    expect(paths).toContain("auth.test.ts");
    expect(paths).toContain("session.ts");
  });

  it("SUBTRAI o que você já mexeu", () => {
    // mexeu em auth.ts E auth.test.ts → auth.test.ts não é lacuna
    const paths = reviewGap(index, ["auth.ts", "auth.test.ts"]).map(
      (g) => g.path,
    );
    expect(paths).not.toContain("auth.test.ts");
    expect(paths).toContain("session.ts");
  });

  it("ranqueia pela força do acoplamento", () => {
    expect(reviewGap(index, ["auth.ts"])[0].path).toBe("auth.test.ts"); // 0.75 > 0.5
  });

  it("diz por causa de qual arquivo alterado a sugestão veio", () => {
    const g = reviewGap(index, ["auth.ts"]).find(
      (x) => x.path === "auth.test.ts",
    );
    expect(g?.relatedTo).toBe("auth.ts");
  });

  it("tudo já tocado → nenhuma lacuna", () => {
    expect(reviewGap(index, ["auth.ts", "auth.test.ts", "session.ts"])).toEqual(
      [],
    );
  });

  it("arquivo alterado sem histórico de acoplamento → []", () => {
    expect(reviewGap(index, ["arquivo-novo.ts"])).toEqual([]);
  });

  it("nada alterado → []", () => {
    expect(reviewGap(index, [])).toEqual([]);
  });

  it("mesmo esquecido puxado por dois: fica a MAIOR força", () => {
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
    expect(g?.strength).toBe(1); // o vínculo forte (a.ts), não o fraco (b.ts)
    expect(g?.relatedTo).toBe("a.ts");
  });
});
