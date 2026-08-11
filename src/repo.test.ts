import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isGitRepo, resolveRepoPath } from "./repo.js";
import {
  commitFile,
  makeTmpRepo,
  removeRepo,
} from "./git/tmp-repo.testutil.js";

let repo: string;

beforeEach(async () => {
  repo = await makeTmpRepo();
});

afterEach(async () => {
  await removeRepo(repo);
});

describe("resolveRepoPath", () => {
  it("falls back to cwd when the variable is unset", () => {
    expect(resolveRepoPath({})).toBe(process.cwd());
  });

  it("ignores a variable that holds only whitespace", () => {
    expect(resolveRepoPath({ MCP_DOSSIER_REPO: "   " })).toBe(process.cwd());
  });

  it("resolves a relative path against cwd", () => {
    expect(resolveRepoPath({ MCP_DOSSIER_REPO: "some/project" })).toBe(
      resolve("some/project"),
    );
  });

  it("keeps an absolute path", () => {
    expect(resolveRepoPath({ MCP_DOSSIER_REPO: repo })).toBe(repo);
  });
});

describe("isGitRepo", () => {
  it("accepts a repository", async () => {
    await commitFile(repo, "a.ts", "a\n", "chore: a");

    expect(await isGitRepo(repo)).toBe(true);
  });

  it("accepts a subdirectory of a repository", async () => {
    await mkdir(join(repo, "src"));
    await commitFile(repo, join("src", "a.ts"), "a\n", "chore: a");

    expect(await isGitRepo(join(repo, "src"))).toBe(true);
  });

  it("accepts a repository with no commits yet", async () => {
    expect(await isGitRepo(repo)).toBe(true);
  });

  it("rejects a plain directory", async () => {
    const plain = await mkdtemp(join(tmpdir(), "dossier-plain-"));

    expect(await isGitRepo(plain)).toBe(false);

    await removeRepo(plain);
  });

  it("rejects a path that doesn't exist", async () => {
    expect(await isGitRepo(join(repo, "nope", "nowhere"))).toBe(false);
  });
});
