import { describe, it, expect } from "vitest";

import { formatCoupled } from "./coupled-files.js";
import type { CoupledFile } from "../analysis/coupling.js";

const results: CoupledFile[] = [
  { path: "src/git/run.ts", strength: 1, coChanges: 3 },
  { path: "src/index/build.ts", strength: 2 / 3, coChanges: 2 },
];

describe("formatCoupled", () => {
  it("mentions the target file", () => {
    expect(formatCoupled("src/git/commits.ts", results)).toContain(
      "src/git/commits.ts",
    );
  });

  it("one line per result, with percentage, evidence and path", () => {
    const out = formatCoupled("target.ts", results);
    expect(out).toContain("100% (3x) src/git/run.ts");
  });

  it("rounds the percentage (0.666… becomes 67%)", () => {
    expect(formatCoupled("target.ts", results)).toContain(
      "67% (2x) src/index/build.ts",
    );
  });

  it("no coupling: returns a clear message, not empty text", () => {
    const out = formatCoupled("target.ts", []);
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("target.ts");
    expect(out).not.toContain("%");
  });

  it("wastes no lines: one per result beyond the header", () => {
    const lines = formatCoupled("target.ts", results)
      .split("\n")
      .filter((l) => l.trim() !== "");
    expect(lines).toHaveLength(3); // 1 header + 2 results
  });
});
