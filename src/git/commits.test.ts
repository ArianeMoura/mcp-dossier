import { describe, it, expect } from "vitest";

import { parseLog, US, RS } from "./commits.js";

// Fixtures mimicking `git log --numstat`: each commit starts with RS, the header
// on the first line, one numstat line per file below it.
const c1 =
  `${RS}hashAAA${US}Ana Lima${US}ana@example.com${US}2026-01-02T10:00:00-03:00${US}fix: correct login\n` +
  `10\t2\tsrc/auth.ts\n` +
  `5\t0\tsrc/auth.test.ts\n`;

const c2 =
  `${RS}hashBBB${US}Bia Souza${US}bia@example.com${US}2025-06-01T09:30:00-03:00${US}feat: support a || b in the parser\n` +
  `1\t1\tsrc/parser.ts\n` +
  `-\t-\tassets/logo.png\n`; // binary: "-" for added and removed

// c1, a blank line between commits, c2
const raw = `${c1}\n${c2}`;

describe("parseLog", () => {
  it("returns one Commit per block (ignores the empty part before the 1st RS)", () => {
    expect(parseLog(raw)).toHaveLength(2);
  });

  it("captures the hash of the first commit", () => {
    expect(parseLog(raw)[0].hash).toBe("hashAAA");
  });

  it("does not let junk leak into the second commit's hash", () => {
    expect(parseLog(raw)[1].hash).toBe("hashBBB");
  });

  it("captures author and email", () => {
    const c = parseLog(raw)[0];
    expect(c.author).toBe("Ana Lima");
    expect(c.email).toBe("ana@example.com");
  });

  it("converts the date into a real Date (not a string)", () => {
    const c = parseLog(raw)[0];
    expect(c.date).toBeInstanceOf(Date);
    expect(c.date.toISOString()).toBe("2026-01-02T13:00:00.000Z");
  });

  it("keeps a subject with | and does NOT let file lines leak into it", () => {
    // The trap: splitting the whole block on US glues the subject to
    // "\n10\t2\t...". The subject must be only the first line.
    expect(parseLog(raw)[1].subject).toBe("feat: support a || b in the parser");
  });

  it("captures each commit's files", () => {
    const c = parseLog(raw)[0];
    expect(c.files).toHaveLength(2);
    expect(c.files[0]).toEqual({ path: "src/auth.ts", added: 10, removed: 2 });
    expect(c.files[1]).toEqual({
      path: "src/auth.test.ts",
      added: 5,
      removed: 0,
    });
  });

  it("treats a binary file (numstat '-') as 0 lines", () => {
    const bin = parseLog(raw)[1].files[1];
    expect(bin).toEqual({ path: "assets/logo.png", added: 0, removed: 0 });
  });

  it("returns an empty list for empty input", () => {
    expect(parseLog("")).toEqual([]);
  });
});
