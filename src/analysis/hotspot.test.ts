import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, it, expect } from "vitest";

import {
  hotspots,
  indentationComplexity,
  rankHotspots,
  isNoise,
} from "./hotspot.js";
import { buildIndex } from "../repo-index/build.js";
import type { Commit } from "../git/commits.js";
import {
  commitFile,
  git,
  makeTmpRepo,
  removeRepo,
} from "../git/tmp-repo.testutil.js";

const nested = [
  "function f() {", // 0
  "  if (x) {", // 2
  "    return 1;", // 4
  "  }", // 2
  "}", // 0
].join("\n"); // average = (0+2+4+2+0)/5 = 1.6

const flat = ["const a = 1;", "const b = 2;", "return a + b;"].join("\n");

describe("indentationComplexity", () => {
  it("empty string → 0", () => {
    expect(indentationComplexity("")).toBe(0);
  });

  it("flat code (no indentation) → 0", () => {
    expect(indentationComplexity(flat)).toBe(0);
  });

  it("computes the average indentation of non-blank lines", () => {
    expect(indentationComplexity(nested)).toBe(1.6);
  });

  it("counts a tab as four columns, like four spaces", () => {
    const tabbed = ["f() {", "\tif (x) {", "\t\ty;", "\t}", "}"].join("\n");
    const spaced = ["f() {", "    if (x) {", "        y;", "    }", "}"].join(
      "\n",
    );

    expect(indentationComplexity(tabbed)).toBe(indentationComplexity(spaced));
  });

  it("handles a line that mixes tabs and spaces", () => {
    // one tab (4) + two spaces = 6 columns, over a single non-blank line
    expect(indentationComplexity("\t  x")).toBe(6);
  });

  it("ignores blank lines (including whitespace-only ones)", () => {
    const withBlanks = ["a", "", "  b", "   ", "c"].join("\n");
    // non-blank: "a"(0), "  b"(2), "c"(0) → average 2/3
    expect(indentationComplexity(withBlanks)).toBeCloseTo(2 / 3);
  });

  it("more deeply nested code has higher complexity", () => {
    const shallow = ["if (x) {", "  a;", "}"].join("\n");
    const deep = [
      "f() {",
      "  g() {",
      "    h() {",
      "      x;",
      "    }",
      "  }",
      "}",
    ].join("\n");
    expect(indentationComplexity(deep)).toBeGreaterThan(
      indentationComplexity(shallow),
    );
  });
});

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

describe("rankHotspots", () => {
  // a: 3 commits; b: 1 commit; c: 2 commits (but gone from disk)
  const index = buildIndex([
    commit("c1", ["a", "b"]),
    commit("c2", ["a", "c"]),
    commit("c3", ["a", "c"]),
  ]);

  const complexity: Record<string, number | null> = {
    a: 1.6,
    b: 0,
    c: null, // deleted
  };
  const complexityOf = (path: string) => complexity[path] ?? null;

  it("score = churn × complexity", () => {
    const a = rankHotspots(index, complexityOf).find((h) => h.path === "a");
    expect(a).toMatchObject({ churn: 3, complexity: 1.6, score: 3 * 1.6 });
  });

  it("ranks from highest score to lowest", () => {
    const ranked = rankHotspots(index, complexityOf);
    expect(ranked[0]!.path).toBe("a"); // 4.8 before b (0)
  });

  it("keeps a file whose complexity is zero", () => {
    const paths = rankHotspots(index, complexityOf).map((h) => h.path);
    expect(paths).toContain("b");
  });

  it("skips files gone from disk (complexity null)", () => {
    const paths = rankHotspots(index, complexityOf).map((h) => h.path);
    expect(paths).not.toContain("c");
  });
});

describe("isNoise", () => {
  it("flags lock files and minified files as noise", () => {
    expect(isNoise("package-lock.json")).toBe(true);
    expect(isNoise("frontend/yarn.lock")).toBe(true);
    expect(isNoise("dist/app.min.js")).toBe(true);
  });

  it("does not flag real code", () => {
    expect(isNoise("src/git/run.ts")).toBe(false);
    expect(isNoise("src/lock.ts")).toBe(false); // "lock" in the name, but code
  });
});

describe("hotspots (reads the working tree)", () => {
  const indented = ["f() {", "  if (x) {", "    y;", "  }", "}"].join("\n");

  let repo: string;
  let outside: string;

  beforeEach(async () => {
    repo = await makeTmpRepo();
    outside = await mkdtemp(join(tmpdir(), "dossier-outside-"));
  });

  afterEach(async () => {
    await removeRepo(repo);
    await removeRepo(outside);
  });

  it("ranks a real file it can read", async () => {
    await commitFile(repo, "a.ts", indented, "feat: a");

    const paths = (await hotspots(repo)).map((h) => h.path);

    expect(paths).toContain("a.ts");
  });

  it("does not follow a tracked symlink out of the repository", async () => {
    const target = join(outside, "secret.txt");
    await writeFile(target, indented);
    await symlink(target, join(repo, "link.ts"));
    git(repo, "add", "link.ts");
    git(repo, "commit", "-q", "-m", "feat: link");

    const paths = (await hotspots(repo)).map((h) => h.path);

    expect(paths).not.toContain("link.ts");
  });

  it("does not follow a symlinked directory out of the repository", async () => {
    await writeFile(join(outside, "secret.ts"), "        deep\n".repeat(10));

    // A real directory at commit time, a symlink afterwards.
    await mkdir(join(repo, "vault"));
    await commitFile(repo, join("vault", "secret.ts"), indented, "feat: vault");

    await rm(join(repo, "vault"), { recursive: true, force: true });
    await symlink(outside, join(repo, "vault"));

    const paths = (await hotspots(repo)).map((h) => h.path);

    expect(paths).not.toContain("vault/secret.ts");
  });

  it("skips binary files", async () => {
    await commitFile(
      repo,
      "bin.dat",
      "a\0b\0c indented\n  more\n",
      "feat: bin",
    );

    const paths = (await hotspots(repo)).map((h) => h.path);

    expect(paths).not.toContain("bin.dat");
  });

  it("skips files past the size ceiling", async () => {
    await commitFile(repo, "huge.ts", "  x\n".repeat(200_000), "feat: huge");

    const paths = (await hotspots(repo)).map((h) => h.path);

    expect(paths).not.toContain("huge.ts");
  });
});
