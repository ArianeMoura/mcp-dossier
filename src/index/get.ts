import { runGit, readCommits } from "../git/run.js";
import { buildIndex, type RepoIndex } from "./build.js";

// Cache em memória por processo (= por sessão do servidor stdio). Chave: o repo;
// valor: o índice e o SHA do HEAD em que foi construído (a chave de invalidação).
const cache = new Map<string, { head: string; index: RepoIndex }>();

// SHA do HEAD, ou "" se o repo ainda não tem commits. É a chave de invalidação.
async function currentHead(repoPath: string): Promise<string> {
  try {
    return (await runGit(repoPath, ["rev-parse", "HEAD"])).trim();
  } catch {
    return "";
  }
}

// Constrói o índice na primeira vez e reusa o cache nas seguintes, reconstruindo
// só quando o HEAD muda. A checagem (`rev-parse`) é barata; a varredura só roda
// quando há commit novo.
export async function getIndex(repoPath: string): Promise<RepoIndex> {
  const head = await currentHead(repoPath);

  const cached = cache.get(repoPath);
  if (cached && cached.head === head) {
    return cached.index;
  }

  const commits = await readCommits(repoPath);
  const index = buildIndex(commits);
  cache.set(repoPath, { head, index });
  return index;
}
