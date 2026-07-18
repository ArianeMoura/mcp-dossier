import { describe, it, expect } from "vitest";

import { formatRepoBriefing } from "./repo-briefing.js";
import type { RepoBriefing } from "../analysis/briefing.js";
import type { Hotspot } from "../analysis/hotspot.js";

const briefing: RepoBriefing = {
  totalCommits: 8,
  fileCount: 12,
  firstCommit: new Date("2026-07-15T00:00:00.000Z"),
  lastCommit: new Date("2026-07-16T00:00:00.000Z"),
  topAuthors: [
    { email: "ariane@x.com", author: "Ariane Moura", commits: 5 },
    { email: "bia@x.com", author: "Bia Souza", commits: 3 },
  ],
};

const spots: Hotspot[] = [
  { path: "src/git/run.ts", churn: 4, complexity: 3.9, score: 15.7 },
  { path: "src/git/commits.ts", churn: 3, complexity: 3.7, score: 11.1 },
];

describe("formatRepoBriefing", () => {
  it("summarizes volume: commits and files", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("8 commits");
    expect(out).toContain("12 files");
  });

  it("shows the time span as ISO dates", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("2026-07-15");
    expect(out).toContain("2026-07-16");
  });

  it("lists the most active authors with commit counts", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("Ariane Moura");
    expect(out).toContain("5 commits");
    expect(out).toContain("Bia Souza");
  });

  it("lists hotspots with score and path", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("15.7");
    expect(out).toContain("src/git/run.ts");
  });

  it("no hotspots: does not print the section header", () => {
    const out = formatRepoBriefing(briefing, []);
    expect(out).not.toContain("hurts");
    expect(out).toContain("8 commits"); // the rest still shows
  });
});
