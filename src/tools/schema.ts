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

// A non-empty file path, relative to the repository root. The cap is well past
// any real path: the value is echoed back to the client, so an unbounded string
// is free amplification.
export const pathSchema = z
  .string()
  .min(1)
  .max(4096)
  .describe("File path, relative to the repository root");
