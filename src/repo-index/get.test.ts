import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getIndex } from "./get.js";
import {
  commitFile,
  makeTmpRepo,
  removeRepo,
} from "../git/tmp-repo.testutil.js";

let repo: string;

beforeEach(async () => {
  repo = await makeTmpRepo();
});

afterEach(async () => {
  await removeRepo(repo);
});

describe("getIndex", () => {
  it("reuses the cached index while HEAD is unchanged", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");

    const first = await getIndex(repo);
    const second = await getIndex(repo);
    expect(second).toBe(first);
  });

  // Two tools called in parallel arrive before either has finished scanning.
  it("gives concurrent callers the same in-flight build", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");

    const [first, second] = await Promise.all([getIndex(repo), getIndex(repo)]);

    expect(second).toBe(first);
  });

  it("does not serve a failed scan to the next caller", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    await expect(getIndex(repo, { timeoutMs: 1 })).rejects.toThrow();

    expect((await getIndex(repo)).commits).toHaveLength(1);
  });

  it("rebuilds when HEAD moves", async () => {
    await commitFile(repo, "a.ts", "one\n", "feat: a");
    const before = await getIndex(repo);
    expect(before.commits).toHaveLength(1);

    await commitFile(repo, "b.ts", "two\n", "feat: b");
    const after = await getIndex(repo);

    expect(after).not.toBe(before);
    expect(after.commits).toHaveLength(2);
  });
});
