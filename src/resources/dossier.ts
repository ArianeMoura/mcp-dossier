import {
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { getIndex } from "../index/get.js";

import { buildFileDossier } from "../analysis/dossier.js";
import { buildRepoBriefing } from "../analysis/briefing.js";
import { hotspots } from "../analysis/hotspot.js";

import { formatFileDossier } from "../tools/file-dossier.js";
import { formatRepoBriefing } from "../tools/repo-briefing.js";
import { formatHotspots } from "../tools/hotspots.js";

export function registerDossierResources(server: McpServer) {
  // dossier://file/{+path} — o {+path} captura barras (src/git/run.ts).
  server.registerResource(
    "file-dossier",
    new ResourceTemplate("dossier://file/{+path}", { list: undefined }),
    {
      title: "Dossiê de um arquivo",
      description: "O dossiê histórico de um arquivo, endereçável por URI.",
      mimeType: "text/plain",
    },
    async (uri, variables) => {
      const path = decodeURIComponent(String(variables.path));
      const index = await getIndex(process.cwd());
      const dossier = buildFileDossier(index, path, new Date());
      const text = dossier
        ? formatFileDossier(dossier)
        : `Nenhum commit tocou ${path}.`;
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text }] };
    },
  );

  server.registerResource(
    "repo-briefing",
    "dossier://repo",
    {
      title: "Panorama do repositório",
      description: "Resumo histórico do repositório.",
      mimeType: "text/plain",
    },
    async (uri) => {
      const index = await getIndex(process.cwd());
      const briefing = buildRepoBriefing(index);
      const spots = (await hotspots(process.cwd())).slice(0, 5);

      const text =
        briefing.totalCommits === 0
          ? "Repositório sem commits ainda."
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
    },
  );
  server.registerResource(
    "hotspots",
    "dossier://hotspots",
    {
      title: "Hotspots do repositório",
      description: "Arquivos com maior churn × complexidade.",
      mimeType: "text/plain",
    },
    async (uri) => {
      const spots = (await hotspots(process.cwd())).slice(0, 10);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: formatHotspots(spots),
          },
        ],
      };
    },
  );
}
