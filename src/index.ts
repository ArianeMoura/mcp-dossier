#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerCoupledFiles } from "./tools/coupled-files.js";
import { registerFileDossier } from "./tools/file-dossier.js";
import { registerHotspots } from "./tools/hotspots.js";
import { registerRepoBriefing } from "./tools/repo-briefing.js";
import { registerReviewGap } from "./tools/review-gap.js";
import { registerDossierResources } from "./resources/dossier.js";
import { registerDossierPrompts } from "./prompts/dossier.js";

const server = new McpServer({
  name: "mcp-dossier",
  version: "0.0.1",
});

registerCoupledFiles(server);
registerFileDossier(server);
registerHotspots(server);
registerRepoBriefing(server);
registerReviewGap(server);
registerDossierResources(server);
registerDossierPrompts(server);

console.error("mcp-dossier: servidor iniciado"); // stderr: stdout é do protocolo

const transport = new StdioServerTransport();
await server.connect(transport);
