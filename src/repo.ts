import { resolve } from "node:path";

import { runGit, type GitOptions } from "./git/run.js";

// Clients spawn the server from their own directory, not the project's, so cwd
// is only a fallback.
export function resolveRepoPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.MCP_DOSSIER_REPO?.trim();
  return configured ? resolve(configured) : process.cwd();
}

// `rev-parse --git-dir` exits 0 anywhere inside a work tree, so a subdirectory
// of the project is a valid entry point too.
export async function isGitRepo(
  repoPath: string,
  opts: GitOptions = {},
): Promise<boolean> {
  try {
    await runGit(repoPath, ["rev-parse", "--git-dir"], opts);
    return true;
  } catch {
    return false;
  }
}
