import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "./server.js";
import {
  commitFile,
  git,
  makeTmpRepo,
  removeRepo,
} from "./git/tmp-repo.testutil.js";

// A real client/server pair, so the zod schemas and the safeTool wrappers are on
// the path. The handlers read process.cwd(); vitest forks per file, so the spy
// below stays contained.
async function connect(): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([
    client.connect(clientSide),
    createServer().connect(serverSide),
  ]);
  return client;
}

const textOf = (result: unknown) =>
  (result as { content: { text: string }[] }).content[0]!.text;

let repo: string;
let client: Client;

beforeEach(async () => {
  repo = await makeTmpRepo();

  // auth.ts and auth.test.ts in the same commit every time: coupling to find.
  for (const n of [1, 2, 3]) {
    await writeFile(join(repo, "auth.ts"), `  v${n}\n`);
    await writeFile(join(repo, "auth.test.ts"), `  t${n}\n`);
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", `feat: auth ${n}`);
  }
  await commitFile(repo, "lonely.ts", "  solo\n", "feat: lonely");

  vi.spyOn(process, "cwd").mockReturnValue(repo);
  client = await connect();
});

afterEach(async () => {
  await client.close();
  vi.restoreAllMocks();
  await removeRepo(repo);
});

describe("the MCP surface", () => {
  it("advertises every tool, resource and prompt", async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name);
    expect(tools.sort()).toEqual([
      "coupled_files",
      "file_dossier",
      "hotspots",
      "repo_briefing",
      "review_gap",
    ]);

    const resources = (await client.listResources()).resources.map(
      (r) => r.uri,
    );
    expect(resources).toContain("dossier://repo");
    expect(resources).toContain("dossier://hotspots");

    const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
    expect(prompts.sort()).toEqual([
      "onboard-me",
      "review-my-branch",
      "standup",
    ]);
  });

  it("answers file_dossier for a tracked file", async () => {
    const text = textOf(
      await client.callTool({
        name: "file_dossier",
        arguments: { path: "auth.ts" },
      }),
    );
    expect(text).toContain("auth.ts");
    expect(text).toContain("Who knows it:");
  });

  it("says so plainly when nothing touched the file", async () => {
    const text = textOf(
      await client.callTool({
        name: "file_dossier",
        arguments: { path: "ghost.ts" },
      }),
    );
    expect(text).toContain("No commit has touched");
  });

  it("finds the coupling between auth.ts and its test", async () => {
    const text = textOf(
      await client.callTool({
        name: "coupled_files",
        arguments: { path: "auth.ts" },
      }),
    );
    expect(text).toContain("auth.test.ts");
  });

  it("ranks hotspots and honours limit", async () => {
    const text = textOf(
      await client.callTool({ name: "hotspots", arguments: { limit: 1 } }),
    );
    expect(text).toContain("Where it hurts most");
    expect(text.split("\n").filter((l) => l.startsWith("  "))).toHaveLength(1);
  });

  it("briefs the repository", async () => {
    const text = textOf(
      await client.callTool({ name: "repo_briefing", arguments: {} }),
    );
    expect(text).toContain("Most active:");
    expect(text).toContain("Test");
  });

  // The protocol makes `arguments` optional; a tool taking no input has to
  // accept the call without it.
  it("briefs the repository with no arguments field at all", async () => {
    const text = textOf(await client.callTool({ name: "repo_briefing" }));
    expect(text).toContain("Most active:");
  });

  it("suggests the test file review_gap knows you forgot", async () => {
    git(repo, "checkout", "-q", "-b", "feature");
    await commitFile(repo, "auth.ts", "  changed\n", "fix: auth");

    const text = textOf(
      await client.callTool({ name: "review_gap", arguments: {} }),
    );
    expect(text).toContain("auth.test.ts");
  });

  it("serves the resources", async () => {
    const repoRes = await client.readResource({ uri: "dossier://repo" });
    expect(repoRes.contents[0]!.text).toContain("Most active:");

    const file = await client.readResource({ uri: "dossier://file/auth.ts" });
    expect(file.contents[0]!.text).toContain("auth.ts");
  });

  it("rejects a path past the schema bound without echoing it", async () => {
    const long = "a".repeat(5000);

    const file = await client.readResource({ uri: `dossier://file/${long}` });
    expect(file.contents[0]!.text).toBe("Invalid path.");

    const tool = await client.callTool({
      name: "coupled_files",
      arguments: { path: long },
    });
    expect(tool.isError).toBe(true);
    expect(textOf(tool)).not.toContain("aaaa");
  });

  it("rejects a limit outside 1–100", async () => {
    for (const limit of [0, 101]) {
      const result = await client.callTool({
        name: "hotspots",
        arguments: { limit },
      });
      expect(result.isError).toBe(true);
    }
  });

  it("returns a sanitized error when the directory is not a repository", async () => {
    const notARepo = await makeTmpRepo();
    await removeRepo(join(notARepo, ".git"));
    vi.spyOn(process, "cwd").mockReturnValue(notARepo);

    const result = await client.callTool({
      name: "repo_briefing",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(
      "could not read this repository's history",
    );
    expect(textOf(result)).not.toContain("fatal:");

    await removeRepo(notARepo);
  });
});
