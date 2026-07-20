import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { buildFileDossier, type FileDossier } from "../analysis/dossier.js";
import { coupledLine } from "./format.js";

const authorLabel = (n: number) => `${n} ${n === 1 ? "author" : "authors"}`;

export function formatFileDossier(d: FileDossier): string {
  const parts: string[] = [];

  parts.push(d.path);
  parts.push("");

  parts.push(
    `  ${d.churn} commits · ${authorLabel(d.risk.authorCount)} · first touched ${d.daysSinceFirstChange}d ago · last touched ${d.daysSinceLastChange}d ago`,
  );

  parts.push(
    `  risk ${d.risk.score.toFixed(1)} (churn ${d.churn} · ${Math.round(
      d.risk.bugfixRatio * 100,
    )}% bugfix · ${authorLabel(d.risk.authorCount)})`,
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

export function registerFileDossier(server: McpServer) {
  server.registerTool(
    "file_dossier",
    {
      title: "Dossier for a file",
      description:
        "Everything the repository's history knows about a file: risk, who understands it, what changes with it, and what's been happening. Use before touching a file you don't know.",
      inputSchema: {
        path: z.string().describe("File path, relative to the repository root"),
      },
    },
    async ({ path }, { signal }) => {
      const index = await getIndex(process.cwd(), { signal });
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
    },
  );
}
