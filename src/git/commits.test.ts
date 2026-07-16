import { describe, it, expect } from "vitest";

import { parseLog, US, RS } from "./commits.js";

// Fixtures imitando `git log --numstat`: cada commit começa com RS, cabeçalho
// na 1ª linha, uma linha numstat por arquivo abaixo.
const c1 =
  `${RS}hashAAA${US}Ana Lima${US}ana@exemplo.com${US}2026-01-02T10:00:00-03:00${US}fix: corrige login\n` +
  `10\t2\tsrc/auth.ts\n` +
  `5\t0\tsrc/auth.test.ts\n`;

const c2 =
  `${RS}hashBBB${US}Bia Souza${US}bia@exemplo.com${US}2025-06-01T09:30:00-03:00${US}feat: suporta a || b no parser\n` +
  `1\t1\tsrc/parser.ts\n` +
  `-\t-\tassets/logo.png\n`; // binário: "-" em added e removed

// c1, linha em branco entre commits, c2
const raw = `${c1}\n${c2}`;

describe("parseLog", () => {
  it("devolve um Commit por bloco (ignora o vazio antes do 1º RS)", () => {
    expect(parseLog(raw)).toHaveLength(2);
  });

  it("captura o hash do primeiro commit", () => {
    expect(parseLog(raw)[0].hash).toBe("hashAAA");
  });

  it("não deixa lixo vazar para o hash do segundo commit", () => {
    expect(parseLog(raw)[1].hash).toBe("hashBBB");
  });

  it("captura autor e email", () => {
    const c = parseLog(raw)[0];
    expect(c.author).toBe("Ana Lima");
    expect(c.email).toBe("ana@exemplo.com");
  });

  it("converte a data em Date de verdade (não string)", () => {
    const c = parseLog(raw)[0];
    expect(c.date).toBeInstanceOf(Date);
    expect(c.date.toISOString()).toBe("2026-01-02T13:00:00.000Z");
  });

  it("preserva um subject com | e NÃO deixa as linhas de arquivo vazarem nele", () => {
    // A pegadinha: se você fizer split(US) no bloco inteiro, o subject vem
    // colado com "\n10\t2\t...". O subject tem que ser só a 1ª linha.
    expect(parseLog(raw)[1].subject).toBe("feat: suporta a || b no parser");
  });

  it("captura os arquivos de cada commit", () => {
    const c = parseLog(raw)[0];
    expect(c.files).toHaveLength(2);
    expect(c.files[0]).toEqual({ path: "src/auth.ts", added: 10, removed: 2 });
    expect(c.files[1]).toEqual({
      path: "src/auth.test.ts",
      added: 5,
      removed: 0,
    });
  });

  it("trata arquivo binário (numstat '-') como 0 linhas", () => {
    const bin = parseLog(raw)[1].files[1];
    expect(bin).toEqual({ path: "assets/logo.png", added: 0, removed: 0 });
  });

  it("devolve lista vazia para entrada vazia", () => {
    expect(parseLog("")).toEqual([]);
  });
});
