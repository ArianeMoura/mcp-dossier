import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";
import { coupledFiles, type CoupledFile } from "../analysis/coupling.js";

// Camada 4: tradução. A análise vem da camada 3; aqui só formatamos.

// Puro: transforma o resultado da análise no texto que vai para o modelo.
// Denso de propósito — cada token custa contexto.
export function formatCoupled(target: string, results: CoupledFile[]): string {
  if (results.length === 0) {
    return `Nenhum arquivo muda junto com ${target} de forma consistente.`;
  }

  const lines = results.map((result) => {
    const percentage = Math.round(result.strength * 100);

    return `  ${percentage}% (${result.coChanges}x) ${result.path}`;
  });

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
