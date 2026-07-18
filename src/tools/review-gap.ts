import { access } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { changedFiles } from "../git/diff.js";
import { reviewGap, type GapSuggestion } from "../analysis/review-gap.js";

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

export function formatReviewGap(gaps: GapSuggestion[]): string {
  if (gaps.length === 0) {
    return "No obvious gap: what you changed doesn't usually pull other files along.";
  }

  const lines = gaps.map(
    (g) =>
      `  ${Math.round(g.strength * 100)}% (${g.coChanges}x) ${g.path} — with ${g.relatedTo}`,
  );

  return [
    "Usually change together with what you touched, and you didn't:",
    "",
    ...lines,
  ].join("\n");
}

export function registerReviewGap(server: McpServer) {
  server.registerTool(
    "review_gap",
    {
      title: "What I forgot to touch",
      description:
        "Given the branch's current change, points out the files that historically change together with what you edited and that you haven't touched yet. Use before opening the PR.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe("Maximum number of suggestions (default: 10)"),
      },
    },
    async ({ limit }) => {
      const cwd = process.cwd();
      const changed = await changedFiles(cwd);

      if (changed.length === 0) {
        return {
          content: [
            { type: "text", text: "No changes detected on this branch." },
          ],
        };
      }

      const index = await getIndex(cwd);
      const gaps = reviewGap(index, changed);

      // Drop forgotten files that no longer exist (coupling with a deleted file).
      const alive = [];
      for (const g of gaps) {
        if (await exists(join(cwd, g.path))) alive.push(g);
      }

      const top = alive.slice(0, limit ?? 10);
      return { content: [{ type: "text", text: formatReviewGap(top) }] };
    },
  );
}
