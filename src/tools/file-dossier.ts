import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { buildFileDossier, type FileDossier } from "../analysis/dossier.js";
import { coupledLine } from "./format.js";

const autores = (n: number) => `${n} ${n === 1 ? "autor" : "autores"}`;

export function formatFileDossier(d: FileDossier): string {
  const parts: string[] = [];

  parts.push(d.path);
  parts.push("");

  parts.push(
    `  ${d.churn} commits · ${autores(d.risk.authorCount)} · criado há ${d.daysSinceFirstChange}d · último toque há ${d.daysSinceLastChange}d`,
  );

  parts.push(
    `  risco ${d.risk.score.toFixed(1)} (churn ${d.churn} · ${Math.round(
      d.risk.bugfixRatio * 100,
    )}% bugfix · ${autores(d.risk.authorCount)})`,
  );

  if (d.owners.length > 0) {
    parts.push("");
    parts.push("  Quem conhece:");

    for (const owner of d.owners) {
      parts.push(
        `    ${Math.round(owner.knowledge)}  ${owner.author} <${owner.email}>`,
      );
    }
  }

  if (d.coupled.length > 0) {
    parts.push("");
    parts.push("  Muda junto com:");

    for (const file of d.coupled) {
      parts.push(`    ${coupledLine(file)}`);
    }
  }

  if (d.recentSubjects.length > 0) {
    parts.push("");
    parts.push("  Commits recentes:");

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
      title: "Dossiê de um arquivo",
      description:
        "Tudo que a história do repositório sabe sobre um arquivo: risco, quem entende dele, o que muda junto, e o que andou acontecendo. Use antes de mexer num arquivo que você não conhece.",
      inputSchema: {
        path: z
          .string()
          .describe("Caminho do arquivo, relativo à raiz do repositório"),
      },
    },
    async ({ path }) => {
      const index = await getIndex(process.cwd());
      const dossier = buildFileDossier(index, path, new Date());

      if (dossier === null) {
        return {
          content: [
            {
              type: "text",
              text: `Nenhum commit tocou ${path} neste repositório.`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: formatFileDossier(dossier) }] };
    },
  );
}
