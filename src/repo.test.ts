import { realpathSync } from "node:fs";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveRepoPath, resolveRepoRoot } from "./repo.js";
import {
  commitFile,
  git,
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

describe("resolveRepoRoot", () => {
  // macOS puts the temp dir behind /private, and Windows hands out 8.3 short
  // names; git reports neither. `.native` resolves both.
  const real = (path: string) => realpathSync.native(path);

  it("returns the root of a repository", async () => {
    await commitFile(repo, "a.ts", "a\n", "chore: a");

    expect(await resolveRepoRoot(repo)).toBe(real(repo));
  });

  it("climbs to the root from a subdirectory", async () => {
    await mkdir(join(repo, "src"));
    await commitFile(repo, join("src", "a.ts"), "a\n", "chore: a");

    expect(await resolveRepoRoot(join(repo, "src"))).toBe(real(repo));
  });

  it("returns the root of a repository with no commits yet", async () => {
    expect(await resolveRepoRoot(repo)).toBe(real(repo));
  });

  it("rejects a plain directory", async () => {
    const plain = await mkdtemp(join(tmpdir(), "dossier-plain-"));

    expect(await resolveRepoRoot(plain)).toBeNull();

    await removeRepo(plain);
  });

  it("rejects a path that doesn't exist", async () => {
    expect(await resolveRepoRoot(join(repo, "nope", "nowhere"))).toBeNull();
  });

  it("rejects a bare repository", async () => {
    const bare = await mkdtemp(join(tmpdir(), "dossier-bare-"));
    git(bare, "init", "-q", "--bare", "-b", "main");

    expect(await resolveRepoRoot(bare)).toBeNull();

    await removeRepo(bare);
  });
});
