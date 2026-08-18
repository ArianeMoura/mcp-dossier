import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../repo-index/get.js";
import { trackedPaths } from "../repo-index/tracked.js";
import { buildRepoBriefing, type RepoBriefing } from "../analysis/briefing.js";
import { hotspots, type Hotspot } from "../analysis/hotspot.js";
import { plural } from "./format.js";
import { safeTool } from "../safe-handler.js";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// What a handler receives when the tool declares no input schema.
type ToolExtra = Parameters<ToolCallback>[0];

export function formatRepoBriefing(b: RepoBriefing, spots: Hotspot[]): string {
  const parts: string[] = [];

  // Caller only formats a non-empty briefing; guard the dates instead of asserting.
  const span =
    b.firstCommit && b.lastCommit
      ? ` · ${isoDay(b.firstCommit)} to ${isoDay(b.lastCommit)}`
      : "";
  parts.push(
    `${plural(b.totalCommits, "commit")} · ${plural(b.fileCount, "file")}${span}`,
  );

  parts.push("");
  parts.push("  Most active:");

  for (const author of b.topAuthors) {
    parts.push(`    ${plural(author.commits, "commit")}  ${author.author}`);
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

export function registerRepoBriefing(server: McpServer, repoPath: string) {
  server.registerTool(
    "repo_briefing",
    {
      title: "Just arrived, get me up to speed",
      description:
        "Overview of the repository: volume, time span, top contributors and where complexity concentrates. Use when joining a project you don't know.",
      // No inputSchema at all: an empty one rejects a call that omits
      // `arguments`, which the protocol allows.
    },
    safeTool("repo_briefing", async ({ signal }: ToolExtra) => {
      const index = await getIndex(repoPath, { signal });
      const tracked = await trackedPaths(repoPath, index, { signal });
      const briefing = buildRepoBriefing(index, tracked);

      if (briefing.totalCommits === 0) {
        return {
          content: [{ type: "text", text: "Repository has no commits yet." }],
        };
      }

      const spots = (await hotspots(repoPath, { signal })).slice(0, 5);
      return {
        content: [{ type: "text", text: formatRepoBriefing(briefing, spots) }],
      };
    }),
  );
}
