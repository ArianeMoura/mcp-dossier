import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GitTimeoutError } from "./git/run.js";
import { safeResource, safeTool } from "./safe-handler.js";

const ok = { content: [{ type: "text" as const, text: "fine" }] };
const textOf = (r: { content: { text: string }[] }) => r.content[0]!.text;

// git's stderr is the thing that must never reach the client.
const gitFailure = () =>
  new Error(
    "git log failed (exit 128): fatal: not a git repository: /home/ariane/secret",
  );

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safeTool", () => {
  it("passes a successful result through untouched", async () => {
    const result = await safeTool("hotspots", async () => ok)();

    expect(result).toEqual(ok);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("reports a failure as an error result instead of throwing", async () => {
    const result = await safeTool("hotspots", () =>
      Promise.reject(gitFailure()),
    )();

    expect(result.isError).toBe(true);
    expect(textOf(result as never)).toContain(
      'The "hotspots" tool could not read this repository\'s history',
    );
  });

  it("keeps git's stderr out of the client's result", async () => {
    const result = await safeTool("hotspots", () =>
      Promise.reject(gitFailure()),
    )();

    const text = textOf(result as never);
    expect(text).not.toContain("fatal:");
    expect(text).not.toContain("/home/ariane/secret");
  });

  it("logs the full error to stderr", async () => {
    const err = gitFailure();
    await safeTool("hotspots", () => Promise.reject(err))();

    expect(errSpy).toHaveBeenCalledWith(
      "[mcp-dossier] tool hotspots failed:",
      err,
    );
  });

  it("names the timeout and the variable that raises it", async () => {
    const result = await safeTool("hotspots", () =>
      Promise.reject(new GitTimeoutError(15_000, ["log", "--numstat"])),
    )();

    const text = textOf(result as never);
    expect(text).toContain("15000ms");
    expect(text).toContain("MCP_DOSSIER_GIT_TIMEOUT_MS");
  });

  // The argument list can hold a ref read out of the repository.
  it("does not echo the git arguments on a timeout", async () => {
    const result = await safeTool("hotspots", () =>
      Promise.reject(new GitTimeoutError(15_000, ["log", "--numstat"])),
    )();

    expect(textOf(result as never)).not.toContain("--numstat");
  });
});

describe("safeResource", () => {
  const contents = { contents: [{ uri: "dossier://repo", text: "fine" }] };

  it("passes a successful result through untouched", async () => {
    expect(await safeResource("repo-briefing", async () => contents)()).toEqual(
      contents,
    );
  });

  it("re-throws sanitized, with no cause carrying git's stderr", async () => {
    const call = safeResource("repo-briefing", () =>
      Promise.reject(gitFailure()),
    );

    const err: unknown = await call().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(
      /Could not read the "repo-briefing" resource/,
    );
    expect((err as Error).message).not.toContain("/home/ariane/secret");
    // Absent, not merely undefined: a cause would carry git's stderr onward.
    expect("cause" in (err as Error)).toBe(false);
  });

  it("names the timeout and the variable that raises it", async () => {
    const call = safeResource("repo-briefing", () =>
      Promise.reject(new GitTimeoutError(15_000, ["log"])),
    );

    await expect(call()).rejects.toThrow(/MCP_DOSSIER_GIT_TIMEOUT_MS/);
  });
});
