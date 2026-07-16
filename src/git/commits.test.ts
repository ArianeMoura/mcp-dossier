import { describe, it, expect } from "vitest";

import { parseLog, US, RS } from "./commits.js";

/**
 * Fixtures montadas à mão, imitando EXATAMENTE o que o git cospe:
 *   - campos separados por US (0x1F)
 *   - cada commit termina em RS (0x1E), e o git põe um "\n" entre eles
 *   - NÃO há "\n" depois do último RS
 *
 * Consequência (a pegadinha): split(RS) devolve o 2º registro com um "\n"
 * grudado na frente, e um último pedaço VAZIO. parseLog tem que lidar com
 * os dois.
 */
const c1 = `hashAAA${US}Ana Lima${US}ana@exemplo.com${US}2026-01-02T10:00:00-03:00${US}fix: corrige login`;
const c2 = `hashBBB${US}Bia Souza${US}bia@exemplo.com${US}2025-06-01T09:30:00-03:00${US}feat: suporta a || b no parser`;

// Dois commits, no formato real: c1 + RS + "\n" + c2 + RS
const raw = `${c1}${RS}\n${c2}${RS}`;

describe("parseLog", () => {
  it("devolve um Commit por registro (e ignora o pedaço vazio do fim)", () => {
    expect(parseLog(raw)).toHaveLength(2);
  });

  it("captura o hash do primeiro commit", () => {
    expect(parseLog(raw)[0].hash).toBe("hashAAA");
  });

  it("não deixa o \\n vazar para o hash do segundo commit", () => {
    // Se você esquecer de tirar o "\n" da frente, o hash vira "\nhashBBB".
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
    // 10:00 no fuso -03:00 é 13:00 em UTC
    expect(c.date.toISOString()).toBe("2026-01-02T13:00:00.000Z");
  });

  it("preserva um subject que contém o caractere | (prova do delimitador)", () => {
    expect(parseLog(raw)[1].subject).toBe("feat: suporta a || b no parser");
  });

  it("devolve lista vazia para entrada vazia", () => {
    expect(parseLog("")).toEqual([]);
  });
});
