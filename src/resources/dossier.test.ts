import { describe, expect, it } from "vitest";

import { safeDecode } from "./dossier.js";

describe("safeDecode", () => {
  it("decodes a percent-encoded path", () => {
    expect(safeDecode("src%2Fgit%2Frun.ts")).toBe("src/git/run.ts");
  });

  it("falls back to the raw value on malformed encoding", () => {
    expect(safeDecode("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
