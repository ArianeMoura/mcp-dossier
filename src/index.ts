#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { formatHello } from "./hello.js";

const server = new McpServer({
  name: "mcp-dossier",
  version: "0.0.1",
});

server.registerTool(
  "dossier_hello",
  {
    title: "Dossier — sinal de vida",
    description:
      "Confirma que o servidor mcp-dossier está vivo e informa em qual diretório ele está rodando.",
  },
  async () => ({
    content: [{ type: "text", text: formatHello(process.cwd(), new Date()) }],
  }),
);

console.error("Servidor iniciando..."); // stderr: canal separado, seguro para logs

const transport = new StdioServerTransport();
await server.connect(transport);
