import { describe, it, expect } from "vitest";

import { buildFileDossier } from "./dossier.js";
import { buildIndex } from "../repo-index/build.js";
import type { Commit } from "../git/commits.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

function commit(date: Date, subject: string, path = "F"): Commit {
  return {
    hash: String(date.getTime()) + subject,
    author: "Ana",
    email: "ana@x",
    date,
    subject,
    files: [path],
  };
}

describe("buildFileDossier", () => {
  const index = buildIndex([
    commit(daysAgo(0), "fix: today"),
    commit(daysAgo(10), "feat: middle"),
    commit(daysAgo(100), "chore: first"),
  ]);

  it("returns null for a file no commit touched", () => {
    expect(buildFileDossier(index, "ghost.ts", NOW)).toBeNull();
  });

  it("counts every commit that touched the file", () => {
    expect(buildFileDossier(index, "F", NOW)?.churn).toBe(3);
  });

  it("spans from the oldest commit to the newest", () => {
    const d = buildFileDossier(index, "F", NOW);
    expect(d?.daysSinceFirstChange).toBe(100);
    expect(d?.daysSinceLastChange).toBe(0);
  });

  it("reports the newest commit subjects first", () => {
    expect(buildFileDossier(index, "F", NOW)?.recentSubjects).toEqual([
      "fix: today",
      "feat: middle",
      "chore: first",
    ]);
  });

  it("does not report a future-dated commit as negative days", () => {
    const skewed = buildIndex([commit(new Date("2999-01-01"), "feat: skew")]);

    const d = buildFileDossier(skewed, "F", NOW);

    expect(d?.daysSinceLastChange).toBe(0);
    expect(d?.daysSinceFirstChange).toBe(0);
  });
});
