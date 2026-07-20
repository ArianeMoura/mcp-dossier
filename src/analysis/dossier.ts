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

  // byFile is newest first.
  const newest = commits[0];
  const oldest = commits[commits.length - 1];
  if (!newest || !oldest) return null;

  const risk = fileRisk(index, path, now);
  if (risk === null) return null; // unreachable given the guard above

  const lastChange = newest.date;
  const firstChange = oldest.date;
  const days = (d: Date) =>
    Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);

  return {
    path,
    churn: commits.length,
    firstChange,
    lastChange,
    daysSinceFirstChange: days(firstChange),
    daysSinceLastChange: days(lastChange),
    risk,
    owners: fileOwnership(index, path, now).slice(0, MAX_OWNERS),
    coupled: coupledFiles(index, path).slice(0, MAX_COUPLED),
    recentSubjects: commits.slice(0, MAX_SUBJECTS).map((c) => c.subject),
  };
}
