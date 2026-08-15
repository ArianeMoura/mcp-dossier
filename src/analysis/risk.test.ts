import { describe, it, expect } from "vitest";

import { fileRisk } from "./risk.js";
import { buildIndex } from "../repo-index/build.js";
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
    author: email.split("@")[0]!,
    email,
    date,
    subject,
    files: [{ path, added: 1, removed: 0 }],
  };
}

const index = buildIndex([
  commit("ana@x", monthsAgo(0), "fix: crash"),
  commit("ana@x", monthsAgo(0), "feat: new screen"),
  commit("bia@x", monthsAgo(0), "fixes the login bug"),
  commit("bia@x", monthsAgo(0), "refactor"),
]);

describe("fileRisk", () => {
  it("churn = number of commits", () => {
    expect(fileRisk(index, "F", NOW)?.churn).toBe(4);
  });

  it("bugfixRatio from the regex (2 of 4 match fix/bug)", () => {
    expect(fileRisk(index, "F", NOW)?.bugfixRatio).toBeCloseTo(0.5);
  });

  it("authorCount = distinct authors", () => {
    expect(fileRisk(index, "F", NOW)?.authorCount).toBe(2);
  });

  it("score = churn × (1 + bugfixRatio) × authorCount × recency", () => {
    // 4 × 1.5 × 2 × 1 (recency today) = 12
    expect(fileRisk(index, "F", NOW)?.score).toBeCloseTo(12);
  });

  it("recency: a long-idle file scores lower than a recent one", () => {
    const stale = buildIndex([commit("ana@x", monthsAgo(12), "fix: x")]);
    const fresh = buildIndex([commit("ana@x", monthsAgo(0), "fix: x")]);
    const s = fileRisk(stale, "F", NOW)!.score;
    const f = fileRisk(fresh, "F", NOW)!.score;
    expect(s).toBeLessThan(f);
  });

  it("naive regex counts 'prefix' as a bugfix (false positive)", () => {
    const idx = buildIndex([
      commit("ana@x", monthsAgo(0), "add prefix helper"),
    ]);
    expect(fileRisk(idx, "F", NOW)?.bugfixRatio).toBe(1);
  });

  it("a file nobody touched → null", () => {
    expect(fileRisk(index, "does/not/exist", NOW)).toBeNull();
  });
});
