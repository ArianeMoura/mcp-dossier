import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { getIndex } from "../repo-index/get.js";
import { forEachPooled } from "../pool.js";
import type { GitOptions } from "../git/run.js";
import type { RepoIndex } from "../repo-index/build.js";

// A language-agnostic proxy for nesting, blind to long flat functions.
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

// `readContent` returns a file's current content, or null to skip it. The I/O
// stays in the caller.
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

// The candidate set is every path in history, so the reads need ceilings: this
// many open at once, and this much from any single file.
const READ_CONCURRENCY = 16;
const MAX_FILE_BYTES = 512 * 1024;

const contains = (root: string, p: string) =>
  p === root || p.startsWith(root + sep);

async function readCandidate(
  root: string,
  path: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const full = resolve(root, path);
  if (!contains(root, full)) return null;

  try {
    // lstat, not stat: a symlink then fails isFile() and is skipped instead of
    // followed out of the repo.
    const stats = await lstat(full);
    if (!stats.isFile() || stats.size > MAX_FILE_BYTES) return null;

    // lstat guarded only the last component; an intermediate symlink still leads
    // outside. Safe to realpath only after it: the last component is a real file.
    const real = await realpath(full);
    if (!contains(root, real)) return null;

    // Read the resolved path, so a symlink swapped in since can't redirect it.
    const content = await readFile(real, { encoding: "utf8", signal });
    // Indentation is meaningless for binaries, and churn would overrate them.
    return content.includes("\0") ? null : content;
  } catch {
    return null; // unreadable, gone from the working tree, or aborted
  }
}

// Impure counterpart of rankHotspots: reads the working tree, skips noise.
export async function hotspots(
  repoPath: string,
  opts: GitOptions = {},
): Promise<Hotspot[]> {
  const index = await getIndex(repoPath, opts);

  const root = await realpath(repoPath);
  const paths = [...index.byFile.keys()].filter((path) => !isNoise(path));

  const contents = new Map<string, string | null>();
  await forEachPooled(paths, READ_CONCURRENCY, async (path) => {
    contents.set(path, await readCandidate(root, path, opts.signal));
  });

  return rankHotspots(index, (path) => contents.get(path) ?? null);
}
