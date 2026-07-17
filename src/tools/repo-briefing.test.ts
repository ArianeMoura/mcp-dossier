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
  it("resume volume: commits e arquivos", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("8 commits");
    expect(out).toContain("12 arquivos");
  });

  it("mostra o período em datas ISO", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("2026-07-15");
    expect(out).toContain("2026-07-16");
  });

  it("lista os autores mais ativos com contagem de commits", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("Ariane Moura");
    expect(out).toContain("5 commits");
    expect(out).toContain("Bia Souza");
  });

  it("lista os hotspots com score e caminho", () => {
    const out = formatRepoBriefing(briefing, spots);
    expect(out).toContain("15.7");
    expect(out).toContain("src/git/run.ts");
  });

  it("sem hotspots: não imprime cabeçalho da seção", () => {
    const out = formatRepoBriefing(briefing, []);
    expect(out).not.toContain("dói");
    expect(out).toContain("8 commits"); // mas o resto continua
  });
});
