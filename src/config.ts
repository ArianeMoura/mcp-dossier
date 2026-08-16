import { z } from "zod";

// Without an upper bound an absurd timeout silently disables the guard it
// configures.
const MAX_GIT_TIMEOUT_MS = 600_000;

// Reading history costs 0.07 to 0.12ms per file change across the projects in
// bench/, so 120s covers close to a million of them.
const DEFAULT_GIT_TIMEOUT_MS = 120_000;

// `FOO=` in a compose file arrives as an empty string, which coerces to 0 and
// fails every bound.
const unsetIfBlank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema);

const EnvSchema = z.object({
  MCP_DOSSIER_GIT_TIMEOUT_MS: unsetIfBlank(
    z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_GIT_TIMEOUT_MS)
      .default(DEFAULT_GIT_TIMEOUT_MS),
  ),
  // No default: reading everything is the honest answer, and a window silently
  // narrows what coupling and ownership can see.
  MCP_DOSSIER_MAX_COMMITS: unsetIfBlank(
    z.coerce.number().int().positive().optional(),
  ),
});

export type Config = {
  gitTimeoutMs: number;
  maxCommits?: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${detail}`);
  }
  return {
    gitTimeoutMs: parsed.data.MCP_DOSSIER_GIT_TIMEOUT_MS,
    maxCommits: parsed.data.MCP_DOSSIER_MAX_COMMITS,
  };
}

let cached: Config | null = null;

export function getConfig(): Config {
  return (cached ??= loadConfig());
}

// Lets tests re-read env on the next getConfig().
export function resetConfig(): void {
  cached = null;
}
