import { describe, expect, it } from "vitest";

import { limitSchema, pathSchema } from "./schema.js";

const limit = limitSchema("results", 10);

describe("limitSchema", () => {
  it("accepts a positive integer and undefined (optional)", () => {
    expect(limit.parse(5)).toBe(5);
    expect(limit.parse(undefined)).toBeUndefined();
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
});
