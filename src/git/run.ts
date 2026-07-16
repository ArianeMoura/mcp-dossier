import { spawn } from "node:child_process";

import { LOG_FORMAT, parseLog, type Commit } from "./commits.js";

/**
 * Roda o binário `git` dentro de um repositório e devolve o stdout cru.
 *
 * Esta é a ÚNICA função impura da camada 1: ela fala com o mundo (dá spawn
 * num processo). Todo o resto — o parse — é função pura, testável sem git.
 *
 * Usa `spawn` (não `exec`) por dois motivos:
 *   - streaming: `git log` de um repo grande tem megabytes; spawn não tem
 *     teto de buffer.
 *   - segurança: sem shell, os args vão como lista literal. Um caminho de
 *     repositório com espaço ou `;` não consegue virar outro comando.
 *
 * `git -C <repoPath>` roda o git como se estivéssemos naquele diretório,
 * sem precisar mudar o cwd do nosso próprio processo.
 *
 * @param repoPath  caminho do repositório onde rodar o git
 * @param args      argumentos do git, ex.: ["log", "--pretty=format:..."]
 * @returns         o stdout do git, como string
 */
export function runGit(repoPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repoPath, ...args]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    // Dispara quando o próprio git não pôde ser executado (ex.: não instalado).
    child.on("error", reject);

    // Dispara quando o processo termina. code 0 = sucesso.
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(`git ${args.join(" ")} falhou (código ${code}): ${stderr.trim()}`),
        );
      }
    });
  });
}

/**
 * A API pública da camada 1: lê o histórico de um repositório como uma
 * lista de Commit tipados.
 *
 * Compõe as duas peças da fase: runGit (impura, fala com o git) e parseLog
 * (pura, transforma texto em objetos). Esta função é impura só porque
 * chama runGit — a lógica de verdade continua no parseLog, testável.
 *
 * @param repoPath  caminho do repositório
 * @returns         os commits, do mais recente para o mais antigo
 */
export async function readCommits(repoPath: string): Promise<Commit[]> {
  try {
    const raw = await runGit(repoPath, ["log", "--pretty=format:" + LOG_FORMAT]);
    return parseLog(raw);
  } catch (err) {
    // Um repositório recém-criado (git init, sem nenhum commit) faz o
    // `git log` sair com erro. Antes de propagar, confirmamos se é ESSE
    // caso — e não um erro de verdade — com uma pergunta à prova de idioma:
    // `rev-list --all --count` responde "0" e sai com SUCESSO num repo vazio.
    const count = (await runGit(repoPath, ["rev-list", "--all", "--count"])).trim();
    if (count === "0") return [];
    throw err; // era outro erro (ex.: nem é um repositório git): propaga
  }
}
