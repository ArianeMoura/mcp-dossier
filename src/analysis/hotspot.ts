import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getIndex } from "../index/get.js";
import type { RepoIndex } from "../index/build.js";

// Indentation complexity: average leading whitespace of non-blank lines. A
// language-agnostic proxy for nesting; blind to long, flat functions.
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
  churn: number; // number of commits that touched the file
  complexity: number;
  score: number;
};

// Pure: ranks by churn × complexity. `readContent` returns a file's current
// content, or null if it's gone (skipped). I/O stays in the caller → testable.
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

// Generated/data files: they have churn and indentation but aren't code —
// indentation complexity overrates them (e.g. package-lock.json).
const NOISE = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
];

export function isNoise(path: string): boolean {
  return NOISE.some((re) => re.test(path));
}

// Impure wrapper: reads files from disk and ranks them, skipping noise.
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
          contents.set(path, null); // gone from the working tree
        }
      }),
  );

  return rankHotspots(index, (path) => contents.get(path) ?? null);
}
