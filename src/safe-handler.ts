import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";

// Log the full error to stderr (never stdout — the protocol channel), and hand
// the client a clean message instead of git's raw stderr.

function logFailure(kind: string, name: string, err: unknown): void {
  console.error(`[mcp-dossier] ${kind} ${name} failed:`, err);
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
            text: `The "${name}" tool could not read this repository's history. Check the server logs for details.`,
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
      throw new Error(
        `Could not read the "${name}" resource from this repository's history.`,
      );
    }
  };
}
