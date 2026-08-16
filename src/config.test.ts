import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("defaults the git timeout when the var is unset", () => {
    expect(loadConfig({}).gitTimeoutMs).toBe(120_000);
  });

  it("accepts a valid override", () => {
    expect(
      loadConfig({ MCP_DOSSIER_GIT_TIMEOUT_MS: "5000" }).gitTimeoutMs,
    ).toBe(5000);
  });

  it("treats a blank value as unset", () => {
    const config = loadConfig({
      MCP_DOSSIER_GIT_TIMEOUT_MS: "",
      MCP_DOSSIER_MAX_COMMITS: "",
    });

    expect(config.gitTimeoutMs).toBe(120_000);
    expect(config.maxCommits).toBeUndefined();
  });

  it("accepts the maximum timeout", () => {
    expect(
      loadConfig({ MCP_DOSSIER_GIT_TIMEOUT_MS: "600000" }).gitTimeoutMs,
    ).toBe(600_000);
  });

  it.each(["abc", "-1", "0", "1.5", "600001"])(
    "rejects an invalid timeout: %s",
    (value) => {
      expect(() => loadConfig({ MCP_DOSSIER_GIT_TIMEOUT_MS: value })).toThrow(
        /Invalid environment configuration/,
      );
    },
  );

  it("leaves the commit window unset unless asked for", () => {
    expect(loadConfig({}).maxCommits).toBeUndefined();
  });

  it("accepts a commit window", () => {
    expect(loadConfig({ MCP_DOSSIER_MAX_COMMITS: "500" }).maxCommits).toBe(500);
  });

  it.each(["0", "-1", "1.5", "many"])(
    "rejects a commit window of %s",
    (value) => {
      expect(() => loadConfig({ MCP_DOSSIER_MAX_COMMITS: value })).toThrow();
    },
  );
});
