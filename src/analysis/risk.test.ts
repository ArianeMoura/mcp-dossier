import { describe, it, expect } from "vitest";

import { fileRisk } from "./risk.js";
import { buildIndex } from "../index/build.js";
import type { Commit } from "../git/commits.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const MONTH = 30 * 24 * 60 * 60 * 1000;
const monthsAgo = (n: number) => new Date(NOW.getTime() - n * MONTH);

function commit(
  email: string,
  date: Date,
  subject: string,
  path = "F",
): Commit {
  return {
    hash: email + date.getTime() + subject,
    author: email.split("@")[0],
    email,
    date,
    subject,
    files: [{ path, added: 1, removed: 0 }],
  };
}

// 4 commits hoje: 2 bugfix, 2 autores.
const index = buildIndex([
  commit("ana@x", monthsAgo(0), "fix: crash"),
  commit("ana@x", monthsAgo(0), "feat: nova tela"),
  commit("bia@x", monthsAgo(0), "conserta o bug do login"),
  commit("bia@x", monthsAgo(0), "refactor"),
]);

describe("fileRisk", () => {
  it("churn = número de commits", () => {
    expect(fileRisk(index, "F", NOW)?.churn).toBe(4);
  });

  it("bugfixRatio pela regex (2 de 4 casam fix/bug)", () => {
    expect(fileRisk(index, "F", NOW)?.bugfixRatio).toBeCloseTo(0.5);
  });

  it("authorCount = autores distintos", () => {
    expect(fileRisk(index, "F", NOW)?.authorCount).toBe(2);
  });

  it("score = churn × (1 + bugfixRatio) × authorCount × recência", () => {
    // 4 × 1.5 × 2 × 1 (recência hoje) = 12
    expect(fileRisk(index, "F", NOW)?.score).toBeCloseTo(12);
  });

  it("recência: arquivo parado há tempos pontua menos que o recente", () => {
    const stale = buildIndex([commit("ana@x", monthsAgo(12), "fix: x")]);
    const fresh = buildIndex([commit("ana@x", monthsAgo(0), "fix: x")]);
    const s = fileRisk(stale, "F", NOW)!.score;
    const f = fileRisk(fresh, "F", NOW)!.score;
    expect(s).toBeLessThan(f);
  });

  it("regex ingênua conta 'prefix' como bugfix (falso positivo)", () => {
    const idx = buildIndex([
      commit("ana@x", monthsAgo(0), "add prefix helper"),
    ]);
    expect(fileRisk(idx, "F", NOW)?.bugfixRatio).toBe(1);
  });

  it("arquivo que ninguém tocou → null", () => {
    expect(fileRisk(index, "nao/existe", NOW)).toBeNull();
  });
});
