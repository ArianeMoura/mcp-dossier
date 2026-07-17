import type { RepoIndex } from "../index/build.js";
import { coupledFiles, type CoupledFile } from "./coupling.js";
import { fileOwnership, type AuthorKnowledge } from "./ownership.js";
import { fileRisk, type RiskProfile } from "./risk.js";
import { MS_PER_DAY } from "./decay.js";

export type FileDossier = {
  path: string;
  churn: number;
  firstChange: Date;
  lastChange: Date;
  daysSinceFirstChange: number;
  daysSinceLastChange: number;
  risk: RiskProfile;
  owners: AuthorKnowledge[];
  coupled: CoupledFile[];
  recentSubjects: string[];
};

const MAX_OWNERS = 3;
const MAX_COUPLED = 5;
const MAX_SUBJECTS = 3;

export function buildFileDossier(
  index: RepoIndex,
  path: string,
  now: Date,
): FileDossier | null {
  const commits = index.byFile.get(path) ?? [];
  if (commits.length === 0) return null;

  // byFile vem do mais novo para o mais antigo.
  const lastChange = commits[0].date;
  const firstChange = commits[commits.length - 1].date;
  const days = (d: Date) =>
    Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);

  return {
    path,
    churn: commits.length,
    firstChange,
    lastChange,
    daysSinceFirstChange: days(firstChange),
    daysSinceLastChange: days(lastChange),
    risk: fileRisk(index, path, now)!,
    owners: fileOwnership(index, path, now).slice(0, MAX_OWNERS),
    coupled: coupledFiles(index, path).slice(0, MAX_COUPLED),
    recentSubjects: commits.slice(0, MAX_SUBJECTS).map((c) => c.subject),
  };
}
