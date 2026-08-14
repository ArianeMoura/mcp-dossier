import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../repo-index/get.js";
import { buildFileDossier, type FileDossier } from "../analysis/dossier.js";
import { coupledLine, plural } from "./format.js";
import { safeTool } from "../safe-handler.js";
import { pathSchema } from "./schema.js";

export function formatFileDossier(d: FileDossier): string {
  const parts: string[] = [];

  parts.push(d.path);
  parts.push("");

  parts.push(
    `  ${plural(d.churn, "commit")} · ${plural(d.risk.authorCount, "author")} · first touched ${d.daysSinceFirstChange}d ago · last touched ${d.daysSinceLastChange}d ago`,
  );

  parts.push(
    `  risk ${d.risk.score.toFixed(1)} (churn ${d.churn} · ${Math.round(
      d.risk.bugfixRatio * 100,
    )}% bugfix · ${plural(d.risk.authorCount, "author")})`,
  );

  if (d.owners.length > 0) {
    parts.push("");
    parts.push("  Who knows it:");

    for (const owner of d.owners) {
      parts.push(
        `    ${Math.round(owner.knowledge)}  ${owner.author} <${owner.email}>`,
      );
    }
  }

  if (d.coupled.length > 0) {
    parts.push("");
    parts.push("  Changes together with:");

    for (const file of d.coupled) {
      parts.push(`    ${coupledLine(file)}`);
    }
  }

  if (d.recentSubjects.length > 0) {
    parts.push("");
    parts.push("  Recent commits:");

    for (const subject of d.recentSubjects) {
      parts.push(`    ${subject}`);
    }
  }

  return parts.join("\n");
}

export function registerFileDossier(server: McpServer, repoPath: string) {
  server.registerTool(
    "file_dossier",
    {
      title: "Dossier for a file",
      description:
        "Everything the repository's history knows about a file: risk, who understands it, what changes with it, and what's been happening. Use before touching a file you don't know.",
      inputSchema: {
        path: pathSchema,
      },
    },
    safeTool("file_dossier", async ({ path }, { signal }) => {
      const index = await getIndex(repoPath, { signal });
      const dossier = buildFileDossier(index, path, new Date());

      if (dossier === null) {
        return {
          content: [
            {
              type: "text",
              text: `No commit has touched ${path} in this repository.`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: formatFileDossier(dossier) }] };
    }),
  );
}
