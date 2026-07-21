import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A throwaway git repo for integration tests. Deterministic identity and no GPG,
// so commits work on any machine/CI without local git config.
export async function makeTmpRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "dossier-"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "Test");
  git(dir, "config", "commit.gpgsign", "false");
  return dir;
}

export function git(dir: string, ...args: string[]): string {
  return execFileSync("git", ["-C", dir, ...args], {
    stdio: "pipe",
  }).toString();
}

export async function commitFile(
  dir: string,
  path: string,
  content: string,
  subject: string,
): Promise<void> {
  await writeFile(join(dir, path), content);
  git(dir, "add", path);
  git(dir, "commit", "-q", "-m", subject);
}

export async function removeRepo(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
