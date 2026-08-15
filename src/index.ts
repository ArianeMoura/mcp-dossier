#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getConfig } from "./config.js";
import { resolveRepoPath, resolveRepoRoot } from "./repo.js";
import { createServer } from "./server.js";

// All diagnostics go to stderr — stdout carries the MCP JSON-RPC protocol.
const log = (message: string) => console.error(`mcp-dossier: ${message}`);

async function main(): Promise<void> {
  getConfig(); // validate env up front, before the transport connects

  // Fail here rather than from every tool call: a server with no repository to
  // read can't answer anything, and the client surfaces a startup failure.
  const configured = resolveRepoPath();
  const repoRoot = await resolveRepoRoot(configured);
  if (repoRoot === null) {
    throw new Error(
      `not a git repository: ${configured} — set MCP_DOSSIER_REPO to your project's path`,
    );
  }

  const server = createServer(repoRoot);
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

  process.on("uncaughtException", (err) => {
    log(`uncaught exception: ${String(err)}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    log(`unhandled rejection: ${String(reason)}`);
    process.exit(1);
  });

  await server.connect(transport);
  log(`server started on ${repoRoot}`);
}

main().catch((err) => {
  log(`failed to start: ${String(err)}`);
  process.exit(1);
});
