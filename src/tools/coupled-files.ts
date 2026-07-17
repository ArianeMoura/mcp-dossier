import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { coupledFiles, type CoupledFile } from "../analysis/coupling.js";
import { coupledLine } from "./format.js";

// Denso de propósito: cada token de saída custa contexto do modelo.
export function formatCoupled(target: string, results: CoupledFile[]): string {
  if (results.length === 0) {
    return `Nenhum arquivo muda junto com ${target} de forma consistente.`;
  }

  const lines = results.map((result) => `  ${coupledLine(result)}`);

  return [`${target} historicamente muda junto com:`, ...lines].join("\n");
}

export function registerCoupledFiles(server: McpServer) {
  server.registerTool(
    "coupled_files",
    {
      title: "Arquivos que mudam junto",
      description:
        "Dado um arquivo, mostra quais outros arquivos historicamente mudam junto com ele (acoplamento temporal). Útil para descobrir dependências que o código não declara.",
      inputSchema: {
        path: z
          .string()
          .describe("Caminho do arquivo, relativo à raiz do repositório"),
        limit: z
          .number()
          .optional()
          .describe("Quantos resultados no máximo (padrão: 10)"),
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
