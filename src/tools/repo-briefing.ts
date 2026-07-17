import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { buildRepoBriefing, type RepoBriefing } from "../analysis/briefing.js";
import { hotspots, type Hotspot } from "../analysis/hotspot.js";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function formatRepoBriefing(b: RepoBriefing, spots: Hotspot[]): string {
  const parts: string[] = [];

  parts.push(
    `${b.totalCommits} commits · ${b.fileCount} arquivos · ${isoDay(
      b.firstCommit!,
    )} a ${isoDay(b.lastCommit!)}`,
  );

  parts.push("");
  parts.push("  Quem mais mexe:");

  for (const author of b.topAuthors) {
    parts.push(`    ${author.commits} commits  ${author.author}`);
  }

  if (spots.length > 0) {
    parts.push("");
    parts.push("  Onde mais dói:");

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
      title: "Cheguei agora, me situa",
      description:
        "Panorama do repositório: volume, período, quem mais contribui e onde a complexidade se concentra. Use ao entrar num projeto que você não conhece.",
      inputSchema: {},
    },
    async () => {
      const index = await getIndex(process.cwd());
      const briefing = buildRepoBriefing(index);

      if (briefing.totalCommits === 0) {
        return {
          content: [{ type: "text", text: "Repositório sem commits ainda." }],
        };
      }

      const spots = (await hotspots(process.cwd())).slice(0, 5);
      return {
        content: [{ type: "text", text: formatRepoBriefing(briefing, spots) }],
      };
    },
  );
}
