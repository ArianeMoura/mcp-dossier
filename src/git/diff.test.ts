import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { changedFiles } from "./diff.js";
import {
  commitFile,
  configure,
  git,
  makeTmpRepo,
  removeRepo,
} from "./tmp-repo.testutil.js";

let repo: string;
let scratch: string | null = null;

beforeEach(async () => {
  repo = await makeTmpRepo();
});

afterEach(async () => {
  await removeRepo(repo);
  if (scratch) {
    await removeRepo(scratch);
    scratch = null;
  }
});

describe("changedFiles", () => {
  it("lists files changed on the branch since it diverged from main", async () => {
    await commitFile(repo, "base.ts", "base\n", "chore: base");

    git(repo, "checkout", "-q", "-b", "feature");
    await commitFile(repo, "feature.ts", "work\n", "feat: work");

    const changed = await changedFiles(repo);
    expect(changed).toContain("feature.ts");
    expect(changed).not.toContain("base.ts");
  });

  // A CI checkout or `clone --single-branch`. Falling back to HEAD here would
  // hide every committed change.
  it("finds the base when the default branch exists only as a remote ref", async () => {
    await commitFile(repo, "base.ts", "base\n", "chore: base");

    scratch = await mkdtemp(join(tmpdir(), "dossier-clone-"));
    const clone = join(scratch, "work");
    // -c, not a later `git config`: the checkout happens during the clone, so
    // setting it afterwards leaves the working tree already rewritten.
    git(
      scratch,
      "clone",
      "-q",
      "-c",
      "core.autocrlf=false",
      "--single-branch",
      "--branch",
      "main",
      repo,
      clone,
    );
    configure(clone);

    git(clone, "checkout", "-q", "-b", "feature");
    git(clone, "branch", "-q", "-D", "main");
    await commitFile(clone, "feature.ts", "work\n", "feat: work");

    const changed = await changedFiles(clone);
    expect(changed).toContain("feature.ts");
    expect(changed).not.toContain("base.ts");
  });

  it("includes uncommitted and untracked files", async () => {
    await commitFile(repo, "tracked.ts", "v1\n", "chore: tracked");

    await writeFile(join(repo, "tracked.ts"), "v2\n"); // modified, uncommitted
    await writeFile(join(repo, "new.ts"), "new\n"); // untracked

    const changed = await changedFiles(repo);
    expect(changed).toContain("tracked.ts");
    expect(changed).toContain("new.ts");
  });

  // A fresh `git init`: HEAD points at a branch that has no commit yet, so
  // there is nothing to diff against and only the untracked half applies.
  it("lists untracked files in a repository with no commits", async () => {
    await writeFile(join(repo, "first.ts"), "new\n");

    await expect(changedFiles(repo)).resolves.toEqual(["first.ts"]);
  });
});
