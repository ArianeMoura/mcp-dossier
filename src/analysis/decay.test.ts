import { describe, it, expect } from "vitest";

import { decayWeight, monthsBetween, MS_PER_MONTH } from "./decay.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const monthsAgo = (n: number) => new Date(NOW.getTime() - n * MS_PER_MONTH);

describe("decayWeight", () => {
  it("agora vale 1 (sem decaimento)", () => {
    expect(decayWeight(NOW, NOW)).toBe(1);
  });

  it("uma meia-vida (6 meses) vale 0.5", () => {
    expect(decayWeight(monthsAgo(6), NOW)).toBeCloseTo(0.5);
  });

  it("duas meia-vidas (12 meses) vale 0.25", () => {
    expect(decayWeight(monthsAgo(12), NOW)).toBeCloseTo(0.25);
  });

  it("respeita uma meia-vida customizada", () => {
    expect(decayWeight(monthsAgo(3), NOW, 3)).toBeCloseTo(0.5);
  });
});

describe("monthsBetween", () => {
  it("mede a diferença em meses", () => {
    expect(monthsBetween(monthsAgo(6), NOW)).toBeCloseTo(6);
  });
});
