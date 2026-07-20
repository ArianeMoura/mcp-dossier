import { access } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { changedFiles } from "../git/diff.js";
import { reviewGap, type GapSuggestion } from "../analysis/review-gap.js";
import { limitSchema } from "./schema.js";

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
        limit: limitSchema("suggestions", 10),
      },
    },
    async ({ limit }, { signal }) => {
      const cwd = process.cwd();
      const changed = await changedFiles(cwd, { signal });

      if (changed.length === 0) {
        return {
          content: [
            { type: "text", text: "No changes detected on this branch." },
          ],
        };
      }

      const index = await getIndex(cwd, { signal });
      const gaps = reviewGap(index, changed);

      // Drop forgotten files that no longer exist (coupling with a deleted
      // file). Probe existence in parallel — the list can be long.
      const present = await Promise.all(
        gaps.map((g) => exists(join(cwd, g.path))),
      );
      const alive = gaps.filter((_, i) => present[i]);

      const top = alive.slice(0, limit ?? 10);
      return { content: [{ type: "text", text: formatReviewGap(top) }] };
    },
  );
}
