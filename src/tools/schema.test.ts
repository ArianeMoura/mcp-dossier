import { describe, expect, it } from "vitest";

import { limitSchema, pathSchema } from "./schema.js";

const limit = limitSchema("results", 10);

describe("limitSchema", () => {
  it("accepts a positive integer", () => {
    expect(limit.parse(5)).toBe(5);
  });

  it("supplies the fallback when omitted, rather than leaving it undefined", () => {
    expect(limit.parse(undefined)).toBe(10);
  });

  it.each([0, -1, 1.5, 101])("rejects %s", (value) => {
    expect(limit.safeParse(value).success).toBe(false);
  });
});

describe("pathSchema", () => {
  it("accepts a non-empty path", () => {
    expect(pathSchema.parse("src/a.ts")).toBe("src/a.ts");
  });

  it("rejects an empty string", () => {
    expect(pathSchema.safeParse("").success).toBe(false);
  });

  it("rejects a path past the length cap", () => {
    expect(pathSchema.safeParse("a".repeat(4096)).success).toBe(true);
    expect(pathSchema.safeParse("a".repeat(4097)).success).toBe(false);
  });
});
