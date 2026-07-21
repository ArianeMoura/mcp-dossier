import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { changedFiles } from "./diff.js";
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

describe("changedFiles", () => {
  it("lists files changed on the branch since it diverged from main", async () => {
    await commitFile(repo, "base.ts", "base\n", "chore: base");

    git(repo, "checkout", "-q", "-b", "feature");
    await commitFile(repo, "feature.ts", "work\n", "feat: work");

    const changed = await changedFiles(repo);
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
});
