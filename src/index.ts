#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getConfig } from "./config.js";
import { createServer } from "./server.js";

// All diagnostics go to stderr — stdout carries the MCP JSON-RPC protocol.
const log = (message: string) => console.error(`mcp-dossier: ${message}`);

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
