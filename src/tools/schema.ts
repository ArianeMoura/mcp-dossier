import { z } from "zod";

// Bounded positive int: a negative/fractional value would slip into `.slice()`
// and yield nonsense; the cap keeps output within a sane context budget.
export function limitSchema(item: string, fallback: number) {
  return z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe(`Maximum number of ${item} (1–100, default: ${fallback})`);
}

// The useful range shrinks as a repository grows: a pair reaches 100% in a small
// one and tops out near 30% in React, which is why there is no default.
export const minStrengthSchema = z
  .number()
  .min(0)
  .max(1)
  .optional()
  .describe(
    "Drop suggestions weaker than this coupling ratio (0–1, default: 0)",
  );

// A non-empty file path, relative to the repository root. The cap is well past
// any real path: the value is echoed back to the client, so an unbounded string
// is free amplification.
export const pathSchema = z
  .string()
  .min(1)
  .max(4096)
  .describe("File path, relative to the repository root");
