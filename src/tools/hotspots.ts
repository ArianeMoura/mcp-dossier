import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { hotspots, type Hotspot } from "../analysis/hotspot.js";
import { safeTool } from "../safe-handler.js";
import { limitSchema } from "./schema.js";

export function formatHotspots(spots: Hotspot[]): string {
  if (spots.length === 0) {
    return "No hotspots found.";
  }

  const lines = spots.map((spot) => {
    const commits = spot.churn === 1 ? "commit" : "commits";
    return `  ${spot.score.toFixed(1)}  (${spot.churn} ${commits}) ${spot.path}`;
  });

  return ["Where it hurts most (churn × complexity):", "", ...lines].join("\n");
}

export function registerHotspots(server: McpServer) {
  server.registerTool(
    "hotspots",
    {
      title: "Where it hurts most",
      description:
        "The files that change the most and are the most complex (churn × complexity). Where bugs concentrate and refactoring pays off most.",
      inputSchema: {
        limit: limitSchema("hotspots", 10),
      },
    },
    safeTool("hotspots", async ({ limit }, { signal }) => {
      const spots = (await hotspots(process.cwd(), { signal })).slice(
        0,
        limit ?? 10,
      );
      return { content: [{ type: "text", text: formatHotspots(spots) }] };
    }),
  );
}
