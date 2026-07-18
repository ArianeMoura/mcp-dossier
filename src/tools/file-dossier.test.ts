import { describe, it, expect } from "vitest";

import { formatFileDossier } from "./file-dossier.js";
import type { FileDossier } from "../analysis/dossier.js";

const d: FileDossier = {
  path: "src/git/run.ts",
  churn: 4,
  firstChange: new Date("2026-07-01T00:00:00.000Z"),
  lastChange: new Date("2026-07-14T00:00:00.000Z"),
  daysSinceFirstChange: 15,
  daysSinceLastChange: 2,
  risk: {
    path: "src/git/run.ts",
    churn: 4,
    bugfixRatio: 0.25,
    authorCount: 2,
    score: 4.0,
  },
  owners: [
    { email: "ariane@x.com", author: "Ariane Moura", knowledge: 140 },
    { email: "bia@x.com", author: "Bia Souza", knowledge: 12.5 },
  ],
  coupled: [{ path: "src/git/commits.ts", strength: 1, coChanges: 3 }],
  recentSubjects: ["refactor: trim comments", "feat: add git log adapter"],
};

describe("formatFileDossier", () => {
  it("starts with the file path", () => {
    expect(formatFileDossier(d)).toContain("src/git/run.ts");
  });

  it("summarizes the facts: commits, authors and age", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("4 commits");
    expect(out).toContain("2 authors");
    expect(out).toContain("15d"); // first touched
    expect(out).toContain("2d"); // last touched
  });

  it("shows risk with the bugfix ratio already in %", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("risk 4.0");
    expect(out).toContain("25% bugfix");
  });

  it("lists owners with name, email and rounded knowledge", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("Ariane Moura");
    expect(out).toContain("<ariane@x.com>");
    expect(out).toContain("140");
    expect(out).toContain("13"); // 12.5 rounded
  });

  it("lists coupled files in the same format as coupled_files", () => {
    expect(formatFileDossier(d)).toContain("100% (3x) src/git/commits.ts");
  });

  it("lists the subjects of recent commits", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("refactor: trim comments");
    expect(out).toContain("feat: add git log adapter");
  });

  it("uses the singular when there is only one author", () => {
    const out = formatFileDossier({
      ...d,
      risk: { ...d.risk, authorCount: 1 },
    });
    expect(out).toContain("1 author ");
    expect(out).not.toContain("1 authors");
  });

  it("omits empty sections instead of printing a lone header", () => {
    const empty = formatFileDossier({ ...d, coupled: [], owners: [] });
    expect(empty).not.toContain("Changes together with");
    expect(empty).not.toContain("Who knows it");
    expect(empty).toContain("src/git/run.ts"); // the rest still shows
  });
});
