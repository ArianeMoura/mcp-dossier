import { describe, it, expect } from "vitest";

import { formatHello } from "./hello.js";

describe("formatHello", () => {
  const instante = new Date("2026-07-15T20:58:00.000Z");

  it("informa o nome da pasta onde o servidor está rodando", () => {
    const msg = formatHello("/Users/ariane/projetos/mcp-dossier", instante);
    expect(msg).toContain("mcp-dossier");
  });

  it("informa o caminho completo, não só o nome da pasta", () => {
    const msg = formatHello("/Users/ariane/projetos/mcp-dossier", instante);
    expect(msg).toContain("/Users/ariane/projetos/mcp-dossier");
  });

  it("reporta o instante recebido em ISO 8601", () => {
    const msg = formatHello("/tmp/repo", instante);
    expect(msg).toContain("2026-07-15T20:58:00.000Z");
  });

  it("usa o instante que recebeu, e não o relógio do sistema", () => {
    const passado = new Date("1999-12-31T23:59:59.000Z");
    const msg = formatHello("/tmp/repo", passado);
    expect(msg).toContain("1999");
    expect(msg).not.toContain("2026");
  });

  it("devolve uma linha só", () => {
    const msg = formatHello("/tmp/repo", instante);
    expect(msg).not.toContain("\n");
  });

  it("aguenta caminho de raiz sem quebrar", () => {
    expect(() => formatHello("/", instante)).not.toThrow();
  });
});
