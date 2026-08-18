import { describe, expect, it } from "vitest";

import { buildRepoBriefing } from "./briefing.js";
import { buildIndex } from "../repo-index/build.js";
import type { Commit } from "../git/commits.js";

function commit(
  hash: string,
  email: string,
  date: string,
  ...files: string[]
): Commit {
  return {
    hash,
    author: email.split("@")[0]!,
    email,
    date: new Date(date),
    subject: hash,
    files,
  };
}

const index = buildIndex([
  commit("c1", "ana@x", "2026-01-01T00:00:00Z", "a.ts", "gone.ts"),
  commit("c2", "bia@x", "2026-02-01T00:00:00Z", "a.ts"),
  commit("c3", "ana@x", "2026-03-01T00:00:00Z", "b.ts"),
]);

describe("buildRepoBriefing", () => {
  it("counts the files the project has, not the paths history saw", () => {
    const tracked = new Set(["a.ts", "b.ts"]); // gone.ts was deleted
    expect(index.byFile.size).toBe(3);
    expect(buildRepoBriefing(index, tracked).fileCount).toBe(2);
  });

  it("counts a tracked file no commit has touched yet", () => {
    const tracked = new Set(["a.ts", "b.ts", "brand-new.ts"]);
    expect(buildRepoBriefing(index, tracked).fileCount).toBe(3);
  });

  it("totals the commits and spans first to last by author date", () => {
    const briefing = buildRepoBriefing(index, new Set(["a.ts"]));
    expect(briefing.totalCommits).toBe(3);
    expect(briefing.firstCommit?.toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(briefing.lastCommit?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("ranks authors by commit count, keyed on email", () => {
    const top = buildRepoBriefing(index, new Set()).topAuthors;
    expect(top[0]).toMatchObject({ email: "ana@x", commits: 2 });
    expect(top[1]).toMatchObject({ email: "bia@x", commits: 1 });
  });

  it("reports nulls for the dates of an empty history", () => {
    const briefing = buildRepoBriefing(buildIndex([]), new Set());
    expect(briefing.totalCommits).toBe(0);
    expect(briefing.firstCommit).toBeNull();
    expect(briefing.lastCommit).toBeNull();
  });
});
