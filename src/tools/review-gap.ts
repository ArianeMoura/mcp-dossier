import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../repo-index/get.js";
import { trackedPaths } from "../repo-index/tracked.js";
import { changedFiles } from "../git/diff.js";
import { reviewGap, type GapSuggestion } from "../analysis/review-gap.js";
import { coupledLine } from "./format.js";
import { safeTool } from "../safe-handler.js";
import { limitSchema, minStrengthSchema } from "./schema.js";

export function formatReviewGap(gaps: GapSuggestion[]): string {
  if (gaps.length === 0) {
    return "No obvious gap: what you changed doesn't usually pull other files along.";
  }

  const lines = gaps.map((g) => `  ${coupledLine(g)} — with ${g.relatedTo}`);

  return [
    "Usually change together with what you touched, and you didn't:",
    "",
    ...lines,
  ].join("\n");
}

export function registerReviewGap(server: McpServer, repoPath: string) {
  server.registerTool(
    "review_gap",
    {
      title: "What I forgot to touch",
      description:
        "Given the branch's current change, points out the files that historically change together with what you edited and that you haven't touched yet. Use before opening the PR.",
      inputSchema: {
        limit: limitSchema("suggestions", 10),
        minStrength: minStrengthSchema,
      },
    },
    safeTool("review_gap", async ({ limit, minStrength }, { signal }) => {
      const changed = await changedFiles(repoPath, { signal });

      if (changed.length === 0) {
        return {
          content: [
            { type: "text", text: "No changes detected on this branch." },
          ],
        };
      }

      const index = await getIndex(repoPath, { signal });
      const gaps = reviewGap(index, changed, { minStrength });

      // Suggesting a file that isn't there wastes the reader's time. git knows
      // which paths survive at HEAD, which beats a filesystem probe per
      // suggestion: it costs one call however long the list, and it doesn't
      // mistake an untracked leftover for part of the project.
      const tracked = await trackedPaths(repoPath, index, { signal });

      const top = gaps.filter((gap) => tracked.has(gap.path)).slice(0, limit);
      return { content: [{ type: "text", text: formatReviewGap(top) }] };
    }),
  );
}
