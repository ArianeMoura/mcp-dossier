import { z } from "zod";

// A bounded, positive integer count. Without these bounds a negative or
// fractional value slips into `.slice()` and yields nonsense (e.g. slice(0, -5)
// drops the tail); the cap keeps output within a sane model-context budget.
export function limitSchema(item: string, fallback: number) {
  return z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe(`Maximum number of ${item} (1–100, default: ${fallback})`);
}

// A non-empty file path, relative to the repository root.
export const pathSchema = z
  .string()
  .min(1)
  .describe("File path, relative to the repository root");
