import { describe, it, expect } from "vitest";

import { formatHotspots } from "./hotspots.js";
import type { Hotspot } from "../analysis/hotspot.js";

const spots: Hotspot[] = [
  { path: "src/git/run.ts", churn: 4, complexity: 3.9, score: 15.7 },
  { path: "src/git/commits.ts", churn: 3, complexity: 3.7, score: 11.1 },
];

describe("formatHotspots", () => {
  it("one line per hotspot, with score, churn and path", () => {
    const out = formatHotspots(spots);
    expect(out).toContain("src/git/run.ts");
    expect(out).toContain("src/git/commits.ts");
  });

  it("shows the score with one decimal place", () => {
    expect(formatHotspots(spots)).toContain("15.7");
  });

  it("shows churn as context for the score", () => {
    expect(formatHotspots(spots)).toContain("4 commits");
  });

  it("empty list → clear message, not empty text", () => {
    const out = formatHotspots([]);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("undefined");
  });

  it("one line per hotspot beyond the header", () => {
    const lines = formatHotspots(spots)
      .split("\n")
      .filter((l) => l.trim() !== "");
    expect(lines).toHaveLength(3); // header + 2
  });
});
