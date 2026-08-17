import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readLineCounts } from "./line-counts.js";
import { buildIndex, type RepoIndex } from "./build.js";
import { readCommits } from "../git/run.js";
import {
  commitFile,
  git,
  makeTmpRepo,
  removeRepo,
} from "../git/tmp-repo.testutil.js";

let repo: string;
const head = () => git(repo, "rev-parse", "HEAD").trim();

// The index as a session would have it, rebuilt so each call sees current HEAD.
const index = async (): Promise<RepoIndex> =>
  buildIndex(await readCommits(repo));

const countsFor = async (path: string) =>
  readLineCounts(repo, path, await index());

beforeEach(async () => {
  repo = await makeTmpRepo();
});

afterEach(async () => {
  await removeRepo(repo);
});

describe("readLineCounts", () => {
  it("counts added and removed lines per commit", async () => {
    await commitFile(repo, "a.ts", "one\ntwo\nthree\n", "feat: a");
    const first = head();
    await commitFile(repo, "a.ts", "one\n", "fix: trim a");
    const second = head();

    const counts = await countsFor("a.ts");

    expect(counts.get(first)).toBe(3); // 3 added
    expect(counts.get(second)).toBe(2); // 2 removed
  });

  it("ignores commits that touched other files", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    await commitFile(repo, "b.ts", "one\ntwo\n", "feat: b");

    expect((await countsFor("a.ts")).size).toBe(1);
  });

  it("answers for every commit the index attributes to the file", async () => {
    // A side branch that also touched the file, merged back: a pathspec over
    // the whole history would simplify some of these away.
    await commitFile(repo, "a.ts", "base\n", "feat: base");
    git(repo, "checkout", "-q", "-b", "side");
    await commitFile(repo, "a.ts", "base\nside\n", "feat: side");
    git(repo, "checkout", "-q", "main");
    await commitFile(repo, "other.ts", "x\n", "feat: other");
    git(repo, "merge", "-q", "--no-ff", "-m", "merge side", "side");

    const idx = await index();
    const counts = await readLineCounts(repo, "a.ts", idx);
    const attributed = idx.byFile.get("a.ts") ?? [];

    expect(attributed.length).toBeGreaterThan(1);
    for (const commit of attributed) expect(counts.has(commit.hash)).toBe(true);
  });

  it("treats a binary file as 0 lines rather than NaN", async () => {
    await writeFile(join(repo, "logo.png"), Buffer.from([0, 1, 2, 0, 3]));
    git(repo, "add", "logo.png");
    git(repo, "commit", "-q", "-m", "feat: logo");

    expect((await countsFor("logo.png")).get(head())).toBe(0);
  });

  it("reads a path holding pathspec magic literally", async () => {
    // `:` opens pathspec magic, so without --literal-pathspecs git would reject
    // this as an unknown magic word instead of finding the file. `add -A`
    // rather than commitFile, which would hit the same problem staging it.
    await writeFile(join(repo, ":weird.ts"), "one\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "feat: weird");

    expect((await countsFor(":weird.ts")).get(head())).toBe(1);
  });

  it("asks git nothing about a path with no history", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");

    // `log --stdin` with nothing on stdin would read the whole history instead.
    expect((await countsFor("nope.ts")).size).toBe(0);
  });

  it("serves a repeated path from the index's memo", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    const idx = await index();

    expect(readLineCounts(repo, "a.ts", idx)).toBe(
      readLineCounts(repo, "a.ts", idx),
    );
  });

  it("does not carry the memo across a rebuilt index", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    expect((await countsFor("a.ts")).size).toBe(1);

    await commitFile(repo, "a.ts", "one\ntwo\n", "feat: more a");

    expect((await countsFor("a.ts")).size).toBe(2);
  });
});
