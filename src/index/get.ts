import { runGit, readCommits } from "../git/run.js";
import { buildIndex, type RepoIndex } from "./build.js";

/**
 * Camada 2 — o cache. Esta é a metade IMPURA do índice: fala com o git,
 * guarda estado entre chamadas e decide quando reconstruir. A lógica pura
 * de montar o índice mora no buildIndex.
 */

// O cache em memória, por processo (= por sessão, já que o servidor stdio
// vive uma sessão). Chave: o caminho do repo. Valor: o índice e o SHA do
// HEAD em que ele foi construído — a "data de validade".
const cache = new Map<string, { head: string; index: RepoIndex }>();

/**
 * O SHA do commit atual do HEAD, ou "" se o repo ainda não tem commits.
 * É a chave de invalidação: se o HEAD mudou, o índice está velho.
 */
async function currentHead(repoPath: string): Promise<string> {
  try {
    return (await runGit(repoPath, ["rev-parse", "HEAD"])).trim();
  } catch {
    return ""; // repo recém-criado, sem commits — HEAD não existe ainda
  }
}

/**
 * Devolve o índice do repositório, construindo-o na primeira vez e
 * reusando o cache nas seguintes — a menos que o HEAD tenha mudado, caso
 * em que reconstrói. Barato quando nada mudou (só um `git rev-parse`),
 * caro só quando há commits novos.
 *
 * @param repoPath  caminho do repositório
 * @returns         o índice, pronto para as consultas da camada 3
 */
export async function getIndex(repoPath: string): Promise<RepoIndex> {
  const head = await currentHead(repoPath);

  const cached = cache.get(repoPath);
  if (cached && cached.head === head) {
    return cached.index; // cache quente e fresco: HEAD não mudou
  }

  // Primeira vez, ou o HEAD mudou: reconstrói e regrava.
  const commits = await readCommits(repoPath);
  const index = buildIndex(commits);
  cache.set(repoPath, { head, index });
  return index;
}
