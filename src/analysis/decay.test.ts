import { describe, it, expect } from "vitest";

import { decayWeight, monthsBetween, MS_PER_MONTH } from "./decay.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const monthsAgo = (n: number) => new Date(NOW.getTime() - n * MS_PER_MONTH);

describe("decayWeight", () => {
  it("now is worth 1 (no decay)", () => {
    expect(decayWeight(NOW, NOW)).toBe(1);
  });

  it("one half-life (6 months) is worth 0.5", () => {
    expect(decayWeight(monthsAgo(6), NOW)).toBeCloseTo(0.5);
  });

  it("two half-lives (12 months) is worth 0.25", () => {
    expect(decayWeight(monthsAgo(12), NOW)).toBeCloseTo(0.25);
  });

  it("honors a custom half-life", () => {
    expect(decayWeight(monthsAgo(3), NOW, 3)).toBeCloseTo(0.5);
  });
});

describe("monthsBetween", () => {
  it("measures the difference in months", () => {
    expect(monthsBetween(monthsAgo(6), NOW)).toBeCloseTo(6);
  });
});
