import type { RepoIndex } from "../index/build.js";
import { decayWeight } from "./decay.js";

// Heuristic: blends signals with arbitrary weights (v1).
export type RiskProfile = {
  path: string;
  churn: number;
  bugfixRatio: number; // fraction of commits that look like fixes
  authorCount: number;
  score: number;
};

// Deliberately naive: matches "prefix"/"suffix" and misses non-English fixes.
const BUGFIX_RE = /fix|bug|hotfix|revert/i;

// Risk profile of a file, or null if nobody touched it.
// score = churn × (1 + bugfixRatio) × authorCount × recency.
export function fileRisk(
  index: RepoIndex,
  path: string,
  now: Date,
  opts: { halfLifeMonths?: number } = {},
): RiskProfile | null {
  const commits = index.byFile.get(path) ?? [];

  if (commits.length === 0) {
    return null;
  }

  const churn = commits.length;

  const bugfixes = commits.filter((commit) => BUGFIX_RE.test(commit.subject));

  const bugfixRatio = bugfixes.length / churn;

  const authorCount = new Set(commits.map((commit) => commit.email)).size;

  const recency = decayWeight(commits[0].date, now, opts.halfLifeMonths);

  const score = churn * (1 + bugfixRatio) * authorCount * recency;

  return {
    path,
    churn,
    bugfixRatio,
    authorCount,
    score,
  };
}
