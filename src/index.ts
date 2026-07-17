#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerCoupledFiles } from "./tools/coupled-files.js";

const server = new McpServer({
  name: "mcp-dossier",
  version: "0.0.1",
});

registerCoupledFiles(server);

console.error("mcp-dossier: servidor iniciado"); // stderr: stdout é do protocolo

const transport = new StdioServerTransport();
await server.connect(transport);
