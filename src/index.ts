#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getConfig } from "./config.js";
import { registerCoupledFiles } from "./tools/coupled-files.js";
import { registerFileDossier } from "./tools/file-dossier.js";
import { registerHotspots } from "./tools/hotspots.js";
import { registerRepoBriefing } from "./tools/repo-briefing.js";
import { registerReviewGap } from "./tools/review-gap.js";
import { registerDossierResources } from "./resources/dossier.js";
import { registerDossierPrompts } from "./prompts/dossier.js";

// All diagnostics go to stderr — stdout carries the MCP JSON-RPC protocol.
const log = (message: string) => console.error(`mcp-dossier: ${message}`);

function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-dossier", version: "0.0.1" });

  registerCoupledFiles(server);
  registerFileDossier(server);
  registerHotspots(server);
  registerRepoBriefing(server);
  registerReviewGap(server);
  registerDossierResources(server);
  registerDossierPrompts(server);

  return server;
}

async function main(): Promise<void> {
  getConfig(); // validate env up front, before the transport connects

  const server = createServer();
  const transport = new StdioServerTransport();

  // Close once, whoever triggers it.
  let closing = false;
  const shutdown = async (reason: string) => {
    if (closing) return;
    closing = true;
    log(`shutting down (${reason})`);
    try {
      await server.close();
    } catch (err) {
      log(`error during shutdown: ${String(err)}`);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // Last-resort guards: log and exit non-zero rather than dying silently.
  process.on("uncaughtException", (err) => {
    log(`uncaught exception: ${String(err)}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    log(`unhandled rejection: ${String(reason)}`);
    process.exit(1);
  });

  await server.connect(transport);
  log("server started");
}

main().catch((err) => {
  log(`failed to start: ${String(err)}`);
  process.exit(1);
});
