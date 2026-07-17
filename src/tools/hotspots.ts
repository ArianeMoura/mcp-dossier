import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { hotspots, type Hotspot } from "../analysis/hotspot.js";

export function formatHotspots(spots: Hotspot[]): string {
  if (spots.length === 0) {
    return "Nenhum hotspot encontrado.";
  }

  const lines = spots.map((spot) => {
    const commits = spot.churn === 1 ? "commit" : "commits";
    return `  ${spot.score.toFixed(1)}  (${spot.churn} ${commits}) ${spot.path}`;
  });

  return ["Onde mais dói (churn × complexidade):", "", ...lines].join("\n");
}

export function registerHotspots(server: McpServer) {
  server.registerTool(
    "hotspots",
    {
      title: "Onde mais dói",
      description:
        "Os arquivos que mais mudam e são mais complexos (churn × complexidade). Onde bugs se concentram e refatorar dá mais retorno.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe("Quantos hotspots no máximo (padrão: 10)"),
      },
    },
    async ({ limit }) => {
      const spots = (await hotspots(process.cwd())).slice(0, limit ?? 10);
      return { content: [{ type: "text", text: formatHotspots(spots) }] };
    },
  );
}
