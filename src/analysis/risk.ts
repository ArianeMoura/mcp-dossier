import type { RepoIndex } from "../index/build.js";
import { decayWeight } from "./decay.js";

// Camada 3: risco. Heurística — combina sinais, com pesos arbitrários (v1).

export type RiskProfile = {
  path: string;
  churn: number;
  bugfixRatio: number; // fração de commits que parecem conserto
  authorCount: number;
  score: number;
};

// Ingênua de propósito: casa "prefix"/"suffix" e perde "corrige" (outros idiomas).
const BUGFIX_RE = /fix|bug|hotfix|revert/i;

// Perfil de risco de um arquivo, ou null se ninguém o tocou.
// score = churn × (1 + bugfixRatio) × authorCount × recência.
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
