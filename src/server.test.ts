import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { resolveRepoRoot } from "./repo.js";
import { createServer } from "./server.js";
import {
  commitFile,
  git,
  makeTmpRepo,
  removeRepo,
} from "./git/tmp-repo.testutil.js";

// A real client/server pair, so the zod schemas and the safeTool wrappers are on
// the path.
async function connect(repoPath: string): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([
    client.connect(clientSide),
    createServer(repoPath).connect(serverSide),
  ]);
  return client;
}

const textOf = (result: unknown) =>
  (result as { content: { text: string }[] }).content[0]!.text;

// Resource contents are text-or-blob in the SDK's types; every one here is text.
const resourceTextOf = (result: unknown) =>
  (result as { contents: { text: string }[] }).contents[0]!.text;

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

  client = await connect(repo);
});

afterEach(async () => {
  await client.close();
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

  it("drops suggestions below minStrength", async () => {
    // auth.ts alone once more, so its coupling with the test falls under 100%.
    await commitFile(repo, "auth.ts", "  solo\n", "chore: auth alone");
    git(repo, "checkout", "-q", "-b", "feature");
    await commitFile(repo, "auth.ts", "  changed\n", "fix: auth");

    const gapsAt = async (minStrength: number) =>
      textOf(
        await client.callTool({
          name: "review_gap",
          arguments: { minStrength },
        }),
      );

    expect(await gapsAt(0.5)).toContain("auth.test.ts");
    expect(await gapsAt(1)).not.toContain("auth.test.ts");
  });

  it("rejects a minStrength outside 0–1", async () => {
    const result = await client.callTool({
      name: "review_gap",
      arguments: { minStrength: 1.5 },
    });

    expect(result.isError).toBe(true);
  });

  it("ranks hotspots when the configured path is a subdirectory", async () => {
    await mkdir(join(repo, "nested"));
    await commitFile(
      repo,
      join("nested", "deep.ts"),
      "        deep\n".repeat(4),
      "feat: deep",
    );

    const root = await resolveRepoRoot(join(repo, "nested"));
    expect(root).not.toBeNull();
    const fromSubdir = await connect(root!);

    const text = textOf(
      await fromSubdir.callTool({ name: "hotspots", arguments: { limit: 10 } }),
    );
    expect(text).toContain("nested/deep.ts");

    await fromSubdir.close();
  });

  it("serves the resources", async () => {
    const repoRes = await client.readResource({ uri: "dossier://repo" });
    expect(resourceTextOf(repoRes)).toContain("Most active:");

    const file = await client.readResource({ uri: "dossier://file/auth.ts" });
    expect(resourceTextOf(file)).toContain("auth.ts");
  });

  it("rejects a path past the schema bound without echoing it", async () => {
    const long = "a".repeat(5000);

    const file = await client.readResource({ uri: `dossier://file/${long}` });
    expect(resourceTextOf(file)).toBe("Invalid path.");

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

  it("answers on a repository with no commits instead of failing", async () => {
    const empty = await makeTmpRepo();
    const fresh = await connect(empty);

    for (const [name, args] of [
      ["repo_briefing", {}],
      ["hotspots", {}],
      ["review_gap", {}],
      ["file_dossier", { path: "anything.ts" }],
      ["coupled_files", { path: "anything.ts" }],
    ] as const) {
      const result = await fresh.callTool({ name, arguments: args });
      expect(result.isError, `${name} errored`).toBeFalsy();
    }

    const file = await fresh.readResource({
      uri: "dossier://file/anything.ts",
    });
    expect(resourceTextOf(file)).toContain("No commit has touched");

    await fresh.close();
    await removeRepo(empty);
  });

  it("returns a sanitized error when the directory is not a repository", async () => {
    const notARepo = await makeTmpRepo();
    await removeRepo(join(notARepo, ".git"));
    const stray = await connect(notARepo);

    const result = await stray.callTool({
      name: "repo_briefing",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(
      "could not read this repository's history",
    );
    expect(textOf(result)).not.toContain("fatal:");

    await stray.close();
    await removeRepo(notARepo);
  });
});
