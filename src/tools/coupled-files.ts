import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { coupledFiles, type CoupledFile } from "../analysis/coupling.js";
import { coupledLine } from "./format.js";

// Deliberately dense: every output token costs model context.
export function formatCoupled(target: string, results: CoupledFile[]): string {
  if (results.length === 0) {
    return `No file changes consistently with ${target}.`;
  }

  const lines = results.map((result) => `  ${coupledLine(result)}`);

  return [`${target} historically changes together with:`, ...lines].join("\n");
}

export function registerCoupledFiles(server: McpServer) {
  server.registerTool(
    "coupled_files",
    {
      title: "Files that change together",
      description:
        "Given a file, shows which other files have historically changed together with it (temporal coupling). Useful for finding dependencies the code doesn't declare.",
      inputSchema: {
        path: z.string().describe("File path, relative to the repository root"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results (default: 10)"),
      },
    },
    async ({ path, limit }) => {
      const index = await getIndex(process.cwd());
      const results = coupledFiles(index, path).slice(0, limit ?? 10);
      return {
        content: [{ type: "text", text: formatCoupled(path, results) }],
      };
    },
  );
}
