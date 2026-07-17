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
  it("começa pelo caminho do arquivo", () => {
    expect(formatFileDossier(d)).toContain("src/git/run.ts");
  });

  it("resume os fatos: commits, autores e idade", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("4 commits");
    expect(out).toContain("2 autores");
    expect(out).toContain("15d"); // criado há
    expect(out).toContain("2d"); // último toque há
  });

  it("mostra o risco com a proporção de bugfix já em %", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("risco 4.0");
    expect(out).toContain("25% bugfix");
  });

  it("lista os donos com nome, email e conhecimento arredondado", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("Ariane Moura");
    expect(out).toContain("<ariane@x.com>");
    expect(out).toContain("140");
    expect(out).toContain("13"); // 12.5 arredondado
  });

  it("lista os acoplados no mesmo formato da coupled_files", () => {
    expect(formatFileDossier(d)).toContain("100% (3x) src/git/commits.ts");
  });

  it("lista os assuntos dos commits recentes", () => {
    const out = formatFileDossier(d);
    expect(out).toContain("refactor: trim comments");
    expect(out).toContain("feat: add git log adapter");
  });

  it("usa o singular quando há só um autor", () => {
    const out = formatFileDossier({
      ...d,
      risk: { ...d.risk, authorCount: 1 },
    });
    expect(out).toContain("1 autor ");
    expect(out).not.toContain("1 autores");
  });

  it("omite seções vazias em vez de imprimir cabeçalho solto", () => {
    const vazio = formatFileDossier({ ...d, coupled: [], owners: [] });
    expect(vazio).not.toContain("Muda junto com");
    expect(vazio).not.toContain("Quem conhece");
    expect(vazio).toContain("src/git/run.ts"); // mas o resto continua
  });
});
