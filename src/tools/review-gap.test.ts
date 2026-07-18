import { describe, it, expect } from "vitest";

import { formatReviewGap } from "./review-gap.js";
import type { GapSuggestion } from "../analysis/review-gap.js";

const gaps: GapSuggestion[] = [
  { path: "auth.test.ts", strength: 0.82, coChanges: 9, relatedTo: "auth.ts" },
];

describe("formatReviewGap", () => {
  it("shows the forgotten file with %, evidence and the file that pulled it", () => {
    const out = formatReviewGap(gaps);
    expect(out).toContain("82% (9x) auth.test.ts");
    expect(out).toContain("auth.ts");
  });

  it("no gaps: clear message, not empty text", () => {
    const out = formatReviewGap([]);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("%");
  });
});
