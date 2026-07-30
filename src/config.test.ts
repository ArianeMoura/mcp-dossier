import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("defaults the git timeout when the var is unset", () => {
    expect(loadConfig({}).gitTimeoutMs).toBe(15_000);
  });

  it("accepts a valid override", () => {
    expect(
      loadConfig({ MCP_DOSSIER_GIT_TIMEOUT_MS: "5000" }).gitTimeoutMs,
    ).toBe(5000);
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
});
