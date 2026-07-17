import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getIndex } from "../index/get.js";
import type { RepoIndex } from "../index/build.js";

// Complexidade por indentação: média de espaços à esquerda das linhas não-vazias.
// Proxy agnóstico de linguagem para aninhamento; cega para funções longas e planas.
export function indentationComplexity(content: string): number {
  const lines = content.split("\n");

  const nonEmptyLines = lines.filter((line) => line.trim() !== "");

  if (nonEmptyLines.length === 0) {
    return 0;
  }

  const indentations = nonEmptyLines.map(
    (line) => line.length - line.trimStart().length,
  );

  const total = indentations.reduce((sum, indentation) => sum + indentation, 0);

  return total / indentations.length;
}

export type Hotspot = {
  path: string;
  churn: number; // nº de commits que tocaram o arquivo
  complexity: number;
  score: number;
};

// Puro: ranqueia por churn × complexidade. readContent devolve o conteúdo atual
// do arquivo, ou null se ele sumiu (pulado). O I/O fica no chamador → testável.
export function rankHotspots(
  index: RepoIndex,
  readContent: (path: string) => string | null,
): Hotspot[] {
  const spots: Hotspot[] = [];

  for (const [path, commits] of index.byFile) {
    const content = readContent(path);
    if (content === null) continue;

    const churn = commits.length;
    const complexity = indentationComplexity(content);
    spots.push({ path, churn, complexity, score: churn * complexity });
  }

  return spots.sort((a, b) => b.score - a.score);
}

// Arquivos gerados/de dados: têm churn e indentação, mas não são código —
// a complexidade por indentação os superestima (ex.: package-lock.json).
const NOISE = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
];

export function isNoise(path: string): boolean {
  return NOISE.some((re) => re.test(path));
}

// Wrapper impuro: lê os arquivos do disco e ranqueia, pulando o ruído.
export async function hotspots(repoPath: string): Promise<Hotspot[]> {
  const index = await getIndex(repoPath);

  const contents = new Map<string, string | null>();
  await Promise.all(
    [...index.byFile.keys()]
      .filter((path) => !isNoise(path))
      .map(async (path) => {
        try {
          contents.set(path, await readFile(join(repoPath, path), "utf8"));
        } catch {
          contents.set(path, null); // sumiu do working tree
        }
      }),
  );

  return rankHotspots(index, (path) => contents.get(path) ?? null);
}
