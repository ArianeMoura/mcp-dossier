import { z } from "zod";

// Bad values fail at startup, not mid-request. Without the upper bound, an
// absurd timeout silently disables the guard it configures.
const MAX_GIT_TIMEOUT_MS = 600_000;

// Cost tracks file changes rather than commits, at 0.08 to 0.13ms each across
// the projects in bench/. 120s covers about 900,000 of them, and the cap still
// bounds a hung git.
const DEFAULT_GIT_TIMEOUT_MS = 120_000;

const EnvSchema = z.object({
  MCP_DOSSIER_GIT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_GIT_TIMEOUT_MS)
    .default(DEFAULT_GIT_TIMEOUT_MS),
});

export type Config = {
  gitTimeoutMs: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${detail}`);
  }
  return { gitTimeoutMs: parsed.data.MCP_DOSSIER_GIT_TIMEOUT_MS };
}

let cached: Config | null = null;

export function getConfig(): Config {
  return (cached ??= loadConfig());
}

// Lets tests re-read env on the next getConfig().
export function resetConfig(): void {
  cached = null;
}
