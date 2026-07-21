import { z } from "zod";

// Bad values fail at startup, not mid-request.
const EnvSchema = z.object({
  MCP_DOSSIER_GIT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15_000),
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
