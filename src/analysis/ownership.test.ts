import { describe, it, expect } from "vitest";

import { fileOwnership } from "./ownership.js";
import { buildIndex } from "../index/build.js";
import type { Commit } from "../git/commits.js";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const MONTH = 30 * 24 * 60 * 60 * 1000;
const monthsAgo = (n: number) => new Date(NOW.getTime() - n * MONTH);

function commit(
  email: string,
  date: Date,
  added: number,
  removed = 0,
  path = "F",
): Commit {
  return {
    hash: email + date.getTime(),
    author: email.split("@")[0],
    email,
    date,
    subject: "",
    files: [{ path, added, removed }],
  };
}

describe("fileOwnership", () => {
  // bia: 30 linhas hoje. ana: 100 linhas há 12 meses.
  const index = buildIndex([
    commit("bia@x", monthsAgo(0), 30),
    commit("ana@x", monthsAgo(12), 100),
  ]);

  it("commit de hoje pesa 1; commit antigo decai pela meia-vida", () => {
    const r = fileOwnership(index, "F", NOW);
    const bia = r.find((x) => x.email === "bia@x");
    const ana = r.find((x) => x.email === "ana@x");
    expect(bia?.knowledge).toBeCloseTo(30); // 30 × 0.5^0
    expect(ana?.knowledge).toBeCloseTo(25); // 100 × 0.5^(12/6) = 100 × 0.25
  });

  it("rankeia por conhecimento: recência vence volume", () => {
    expect(fileOwnership(index, "F", NOW)[0].email).toBe("bia@x");
  });

  it("conta linhas adicionadas + removidas", () => {
    const idx = buildIndex([commit("ana@x", monthsAgo(0), 10, 5)]);
    expect(fileOwnership(idx, "F", NOW)[0].knowledge).toBeCloseTo(15);
  });

  it("soma os vários commits do mesmo autor", () => {
    const idx = buildIndex([
      commit("ana@x", monthsAgo(0), 10),
      commit("ana@x", monthsAgo(0), 5),
    ]);
    const r = fileOwnership(idx, "F", NOW);
    expect(r).toHaveLength(1);
    expect(r[0].knowledge).toBeCloseTo(15);
  });

  it("arquivo que ninguém tocou → []", () => {
    expect(fileOwnership(index, "nao/existe", NOW)).toEqual([]);
  });
});
