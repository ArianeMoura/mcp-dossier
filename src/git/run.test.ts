import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runGit, readCommits } from "./run.js";
import { commitFile, makeTmpRepo, removeRepo } from "./tmp-repo.testutil.js";

let repo: string;

beforeEach(async () => {
  repo = await makeTmpRepo();
});

afterEach(async () => {
  await removeRepo(repo);
});

describe("readCommits", () => {
  it("returns commits newest first with parsed fields", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    await commitFile(repo, "b.ts", "two\n", "fix: b");

    const commits = await readCommits(repo);

    expect(commits).toHaveLength(2);
    expect(commits[0]?.subject).toBe("fix: b");
    expect(commits[1]?.subject).toBe("feat: a");
    expect(commits[0]?.email).toBe("test@example.com");
  });

  it("returns an empty list for a repo with no commits", async () => {
    expect(await readCommits(repo)).toEqual([]);
  });
});

describe("runGit", () => {
  it("rejects when git exits non-zero", async () => {
    // rev-parse HEAD fails in a repo with no commits.
    await expect(runGit(repo, ["rev-parse", "HEAD"])).rejects.toThrow();
  });

  it("times out and kills a git process that blocks on stdin", async () => {
    // hash-object --stdin waits for stdin, which we never write → it hangs.
    await expect(
      runGit(repo, ["hash-object", "--stdin"], { timeoutMs: 150 }),
    ).rejects.toThrow(/timed out/);
  });

  it("rejects with a cancellation message when aborted", async () => {
    const controller = new AbortController();
    const promise = runGit(repo, ["hash-object", "--stdin"], {
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toThrow(/cancelled/);
  });
});
