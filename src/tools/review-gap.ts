import { access } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { changedFiles } from "../git/diff.js";
import { reviewGap, type GapSuggestion } from "../analysis/review-gap.js";

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

export function formatReviewGap(gaps: GapSuggestion[]): string {
  if (gaps.length === 0) {
    return "Nenhuma lacuna óbvia: o que você mexeu não costuma arrastar outros arquivos.";
  }

  const lines = gaps.map(
    (g) =>
      `  ${Math.round(g.strength * 100)}% (${g.coChanges}x) ${g.path} — junto de ${g.relatedTo}`,
  );

  return [
    "Costumam mudar junto com o que você mexeu, e você não tocou:",
    "",
    ...lines,
  ].join("\n");
}

export function registerReviewGap(server: McpServer) {
  server.registerTool(
    "review_gap",
    {
      title: "O que eu esqueci de tocar",
      description:
        "Dada a mudança atual da branch, aponta os arquivos que historicamente mudam junto com o que você alterou e que você ainda não tocou. Use antes de abrir o PR.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe("Quantas sugestões no máximo (padrão: 10)"),
      },
    },
    async ({ limit }) => {
      const cwd = process.cwd();
      const changed = await changedFiles(cwd);

      if (changed.length === 0) {
        return {
          content: [
            { type: "text", text: "Nenhuma mudança detectada nesta branch." },
          ],
        };
      }

      const index = await getIndex(cwd);
      const gaps = reviewGap(index, changed);

      // Descarta esquecidos que não existem mais (acoplamento com arquivo deletado).
      const alive = [];
      for (const g of gaps) {
        if (await exists(join(cwd, g.path))) alive.push(g);
      }

      const top = alive.slice(0, limit ?? 10);
      return { content: [{ type: "text", text: formatReviewGap(top) }] };
    },
  );
}
