import { z } from "zod";

// Environment configuration. Validated once and memoized; invalid values fail
// loud at startup instead of silently degrading at request time.
const EnvSchema = z.object({
  // Wall-clock ceiling for any single git invocation (ms).
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

// Lazily validated on first use, then reused. index.ts calls this at startup so
// a bad env surfaces before the transport connects.
export function getConfig(): Config {
  return (cached ??= loadConfig());
}

// Test hook: forget the memoized config so the next getConfig() re-reads env.
export function resetConfig(): void {
  cached = null;
}
