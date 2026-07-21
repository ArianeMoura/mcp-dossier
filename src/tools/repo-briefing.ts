import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { buildRepoBriefing, type RepoBriefing } from "../analysis/briefing.js";
import { hotspots, type Hotspot } from "../analysis/hotspot.js";
import { safeTool } from "../safe-handler.js";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function formatRepoBriefing(b: RepoBriefing, spots: Hotspot[]): string {
  const parts: string[] = [];

  // Caller only formats a non-empty briefing; guard the dates instead of asserting.
  const span =
    b.firstCommit && b.lastCommit
      ? ` · ${isoDay(b.firstCommit)} to ${isoDay(b.lastCommit)}`
      : "";
  parts.push(`${b.totalCommits} commits · ${b.fileCount} files${span}`);

  parts.push("");
  parts.push("  Most active:");

  for (const author of b.topAuthors) {
    parts.push(`    ${author.commits} commits  ${author.author}`);
  }

  if (spots.length > 0) {
    parts.push("");
    parts.push("  Where it hurts most:");

    for (const spot of spots) {
      parts.push(`    ${spot.score.toFixed(1)}  ${spot.path}`);
    }
  }

  return parts.join("\n");
}

export function registerRepoBriefing(server: McpServer) {
  server.registerTool(
    "repo_briefing",
    {
      title: "Just arrived, get me up to speed",
      description:
        "Overview of the repository: volume, time span, top contributors and where complexity concentrates. Use when joining a project you don't know.",
      inputSchema: {},
    },
    safeTool("repo_briefing", async (_args, { signal }) => {
      const index = await getIndex(process.cwd(), { signal });
      const briefing = buildRepoBriefing(index);

      if (briefing.totalCommits === 0) {
        return {
          content: [{ type: "text", text: "Repository has no commits yet." }],
        };
      }

      const spots = (await hotspots(process.cwd(), { signal })).slice(0, 5);
      return {
        content: [{ type: "text", text: formatRepoBriefing(briefing, spots) }],
      };
    }),
  );
}
