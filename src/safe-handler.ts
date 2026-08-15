import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";

import { GitTimeoutError } from "./git/run.js";

// Log the full error to stderr (never stdout — the protocol channel), and hand
// the client a clean message instead of git's raw stderr.

function logFailure(kind: string, name: string, err: unknown): void {
  console.error(`[mcp-dossier] ${kind} ${name} failed:`, err);
}

// A timeout is our own error, not git's output, so it is safe to surface.
function clientMessage(fallback: string, err: unknown): string {
  return err instanceof GitTimeoutError
    ? `Reading this repository's history took longer than ${err.timeoutMs}ms. A large repository needs a higher MCP_DOSSIER_GIT_TIMEOUT_MS.`
    : fallback;
}

// Returned as an isError result so the model can react instead of the call throwing.
export function safeTool<A extends unknown[]>(
  name: string,
  handler: (...args: A) => Promise<CallToolResult>,
): (...args: A) => Promise<CallToolResult> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      logFailure("tool", name, err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: clientMessage(
              `The "${name}" tool could not read this repository's history. Check the server logs for details.`,
              err,
            ),
          },
        ],
      };
    }
  };
}

// Resources have no in-band error shape — re-throw sanitized so git's stderr can't leak.
export function safeResource<A extends unknown[]>(
  name: string,
  handler: (...args: A) => Promise<ReadResourceResult>,
): (...args: A) => Promise<ReadResourceResult> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      logFailure("resource", name, err);
      // No `cause`: it would carry git's stderr back toward the client.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(
        clientMessage(
          `Could not read the "${name}" resource from this repository's history.`,
          err,
        ),
      );
    }
  };
}
