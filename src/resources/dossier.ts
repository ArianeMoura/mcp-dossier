import {
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../repo-index/get.js";
import { safeResource } from "../safe-handler.js";

import { buildFileDossier } from "../analysis/dossier.js";
import { buildRepoBriefing } from "../analysis/briefing.js";
import { hotspots } from "../analysis/hotspot.js";

import { formatFileDossier } from "../tools/file-dossier.js";
import { formatRepoBriefing } from "../tools/repo-briefing.js";
import { formatHotspots } from "../tools/hotspots.js";
import { pathSchema } from "../tools/schema.js";

// Malformed percent-encoding falls back to the raw value instead of throwing.
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function registerDossierResources(server: McpServer, repoPath: string) {
  // {+path} captures slashes, so a nested path like src/git/run.ts stays whole.
  server.registerResource(
    "file-dossier",
    new ResourceTemplate("dossier://file/{+path}", { list: undefined }),
    {
      title: "Dossier for a file",
      description: "The historical dossier of a file, addressable by URI.",
      mimeType: "text/plain",
    },
    safeResource("file-dossier", async (uri, variables, { signal }) => {
      // Same bound the tool applies: the path is echoed back, so cap it here too.
      const parsed = pathSchema.safeParse(safeDecode(String(variables.path)));
      if (!parsed.success) {
        return {
          contents: [
            { uri: uri.href, mimeType: "text/plain", text: "Invalid path." },
          ],
        };
      }

      const path = parsed.data;
      const index = await getIndex(repoPath, { signal });
      const dossier = buildFileDossier(index, path, new Date());
      const text = dossier
        ? formatFileDossier(dossier)
        : `No commit has touched ${path}.`;
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text }] };
    }),
  );

  server.registerResource(
    "repo-briefing",
    "dossier://repo",
    {
      title: "Repository overview",
      description: "Historical summary of the repository.",
      mimeType: "text/plain",
    },
    safeResource("repo-briefing", async (uri, { signal }) => {
      const index = await getIndex(repoPath, { signal });
      const briefing = buildRepoBriefing(index);
      const spots = (await hotspots(repoPath, { signal })).slice(0, 5);

      const text =
        briefing.totalCommits === 0
          ? "Repository has no commits yet."
          : formatRepoBriefing(briefing, spots);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text,
          },
        ],
      };
    }),
  );
  server.registerResource(
    "hotspots",
    "dossier://hotspots",
    {
      title: "Repository hotspots",
      description: "Files with the highest churn × complexity.",
      mimeType: "text/plain",
    },
    safeResource("hotspots", async (uri, { signal }) => {
      const spots = (await hotspots(repoPath, { signal })).slice(0, 10);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: formatHotspots(spots),
          },
        ],
      };
    }),
  );
}
