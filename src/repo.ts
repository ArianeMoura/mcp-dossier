import { resolve } from "node:path";

import { runGit, type GitOptions } from "./git/run.js";

// Clients spawn the server from their own directory, not the project's, so cwd
// is only a fallback.
export function resolveRepoPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.MCP_DOSSIER_REPO?.trim();
  return configured ? resolve(configured) : process.cwd();
}

// git reports paths from the work tree root, so a subdirectory would join them
// onto the wrong base. `--show-toplevel` also rejects a bare repository, which
// has no work tree to read.
export async function resolveRepoRoot(
  repoPath: string,
  opts: GitOptions = {},
): Promise<string | null> {
  try {
    const root = await runGit(repoPath, ["rev-parse", "--show-toplevel"], opts);
    // git answers with forward slashes even on Windows; resolve() puts it back
    // in the platform's own form.
    return root.trim() ? resolve(root.trim()) : null;
  } catch {
    return null;
  }
}
