import { existsSync } from "node:fs";
import { chmod, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { gitEnv, runGit, readCommits } from "./run.js";
import {
  commitFile,
  git,
  makeTmpRepo,
  removeRepo,
} from "./tmp-repo.testutil.js";

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

  it("kills git and rejects when output exceeds the cap", async () => {
    await commitFile(repo, "a.ts", "x\n".repeat(5000), "feat: a");

    await expect(
      runGit(repo, ["log", "-p"], { maxOutputChars: 64 }),
    ).rejects.toThrow(/output limit/);
  });

  it("does not run the executable named by the repo's core.fsmonitor", async () => {
    // A hostile clone's .git/config can name any command here, and a plain
    // `git ls-files --others` executes it. Configured after the commit so only
    // the runGit call below could trigger it.
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    const hook = join(repo, "fsmonitor.sh");
    const marker = join(repo, "pwned");
    await writeFile(hook, `#!/bin/sh\ntouch "${marker}"\n`);
    await chmod(hook, 0o755);
    git(repo, "config", "core.fsmonitor", hook);
    await rm(marker, { force: true });

    await runGit(repo, ["ls-files", "--others", "--exclude-standard"]);

    expect(existsSync(marker)).toBe(false);
  });
});

describe("gitEnv", () => {
  it("drops env that would redirect git and disables system config", () => {
    const env = gitEnv({
      PATH: "/usr/bin",
      GIT_DIR: "/elsewhere/.git",
      GIT_WORK_TREE: "/elsewhere",
      GIT_EXTERNAL_DIFF: "/bin/sh",
      GIT_CONFIG_COUNT: "1",
    });

    expect(env.PATH).toBe("/usr/bin");
    expect(env.GIT_CONFIG_NOSYSTEM).toBe("1");
    expect(env.GIT_DIR).toBeUndefined();
    expect(env.GIT_WORK_TREE).toBeUndefined();
    expect(env.GIT_EXTERNAL_DIFF).toBeUndefined();
    expect(env.GIT_CONFIG_COUNT).toBeUndefined();
  });

  it("does not mutate the env it is given", () => {
    const base = { GIT_DIR: "/elsewhere/.git" };
    gitEnv(base);
    expect(base.GIT_DIR).toBe("/elsewhere/.git");
  });
});

describe("readCommits encoding and paths", () => {
  it("keeps non-ASCII author names intact", async () => {
    git(repo, "config", "user.name", "Ariane Moura de Sá");
    await commitFile(repo, "a.ts", "one\n", "feat: acentuação");

    const commits = await readCommits(repo);

    expect(commits[0]?.author).toBe("Ariane Moura de Sá");
    expect(commits[0]?.subject).toBe("feat: acentuação");
    expect(commits[0]?.author).not.toContain("�");
  });

  it("reports a non-ASCII path verbatim, not octal-escaped", async () => {
    await commitFile(repo, "café.ts", "one\n", "feat: cafe");

    const commits = await readCommits(repo);

    expect(commits[0]?.files.map((f) => f.path)).toEqual(["café.ts"]);
  });

  it("records a rename as two paths, never an `old => new` key", async () => {
    await commitFile(repo, "old.ts", "one\n".repeat(20), "feat: old");
    git(repo, "mv", "old.ts", "new.ts");
    git(repo, "commit", "-q", "-m", "refactor: rename");

    const commits = await readCommits(repo);
    const paths = commits.flatMap((c) => c.files.map((f) => f.path));

    expect(paths).toContain("old.ts");
    expect(paths).toContain("new.ts");
    expect(paths.some((p) => p.includes("=>"))).toBe(false);
  });
});
