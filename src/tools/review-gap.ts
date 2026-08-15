import { access } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../repo-index/get.js";
import { changedFiles } from "../git/diff.js";
import { reviewGap, type GapSuggestion } from "../analysis/review-gap.js";
import { coupledLine } from "./format.js";
import { forEachPooled } from "../pool.js";
import { safeTool } from "../safe-handler.js";
import { limitSchema, minStrengthSchema } from "./schema.js";

const PROBE_CONCURRENCY = 16;

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

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

      // Drop coupled files that were since deleted. The set is as large as the
      // branch's history allows, so the probes need a ceiling.
      const present = new Array<boolean>(gaps.length).fill(false);
      await forEachPooled(
        gaps.map((g, i) => ({ g, i })),
        PROBE_CONCURRENCY,
        async ({ g, i }) => {
          present[i] = await exists(join(repoPath, g.path));
        },
      );
      const alive = gaps.filter((_, i) => present[i]);

      const top = alive.slice(0, limit);
      return { content: [{ type: "text", text: formatReviewGap(top) }] };
    }),
  );
}
