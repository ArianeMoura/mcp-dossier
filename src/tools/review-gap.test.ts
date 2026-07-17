import { describe, it, expect } from "vitest";

import { formatReviewGap } from "./review-gap.js";
import type { GapSuggestion } from "../analysis/review-gap.js";

const gaps: GapSuggestion[] = [
  { path: "auth.test.ts", strength: 0.82, coChanges: 9, relatedTo: "auth.ts" },
];

describe("formatReviewGap", () => {
  it("mostra o esquecido com %, evidência e o arquivo que o puxou", () => {
    const out = formatReviewGap(gaps);
    expect(out).toContain("82% (9x) auth.test.ts");
    expect(out).toContain("auth.ts");
  });

  it("sem lacunas: mensagem clara, não texto vazio", () => {
    const out = formatReviewGap([]);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("%");
  });
});
