import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../repo-index/get.js";
import { coupledFiles, type CoupledFile } from "../analysis/coupling.js";
import { coupledLine } from "./format.js";
import { safeTool } from "../safe-handler.js";
import { limitSchema, pathSchema } from "./schema.js";

export function formatCoupled(target: string, results: CoupledFile[]): string {
  if (results.length === 0) {
    return `No file changes consistently with ${target}.`;
  }

  const lines = results.map((result) => `  ${coupledLine(result)}`);

  return [`${target} historically changes together with:`, ...lines].join("\n");
}

export function registerCoupledFiles(server: McpServer, repoPath: string) {
  server.registerTool(
    "coupled_files",
    {
      title: "Files that change together",
      description:
        "Given a file, shows which other files have historically changed together with it (temporal coupling). Useful for finding dependencies the code doesn't declare.",
      inputSchema: {
        path: pathSchema,
        limit: limitSchema("results", 10),
      },
    },
    safeTool("coupled_files", async ({ path, limit }, { signal }) => {
      const index = await getIndex(repoPath, { signal });
      const results = coupledFiles(index, path).slice(0, limit ?? 10);
      return {
        content: [{ type: "text", text: formatCoupled(path, results) }],
      };
    }),
  );
}
