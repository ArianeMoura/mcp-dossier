import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";

// Handlers read git history, which can fail (missing repo, hung/killed process).
// These wrappers keep a failure inside the MCP contract: the full error goes to
// stderr for the operator (never stdout — that's the protocol channel), and the
// client gets a clean message instead of git's raw stderr.

function logFailure(kind: string, name: string, err: unknown): void {
  console.error(`[mcp-dossier] ${kind} ${name} failed:`, err);
}

// Tool errors are returned in-band as an isError result, so the model sees the
// failure and can react rather than the call throwing.
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

// Resource reads have no in-band error shape, so re-throw a sanitized Error;
// the SDK turns it into a proper protocol error without leaking git's stderr.
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
