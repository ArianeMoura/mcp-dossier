import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerCoupledFiles } from "./tools/coupled-files.js";
import { registerFileDossier } from "./tools/file-dossier.js";
import { registerHotspots } from "./tools/hotspots.js";
import { registerRepoBriefing } from "./tools/repo-briefing.js";
import { registerReviewGap } from "./tools/review-gap.js";
import { registerDossierResources } from "./resources/dossier.js";
import { registerDossierPrompts } from "./prompts/dossier.js";

// Single source: this is the version the client sees on handshake.
const { version } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

// The MCP surface, with no transport or process wiring, so tests can drive it.
export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-dossier", version });

  registerCoupledFiles(server);
  registerFileDossier(server);
  registerHotspots(server);
  registerRepoBriefing(server);
  registerReviewGap(server);
  registerDossierResources(server);
  registerDossierPrompts(server);

  return server;
}
