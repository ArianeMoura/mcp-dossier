import { spawn } from "node:child_process";

import { LOG_FORMAT, parseLog, type Commit } from "./commits.js";

// Roda o git num repo e devolve o stdout. Única função impura da camada 1.
// spawn (não exec): sem teto de buffer para saídas grandes, e sem shell — os
// args vão literais, então um caminho com espaço ou `;` não vira outro comando.
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

    child.on("error", reject); // git não pôde ser executado (ex.: não instalado)
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

// API pública da camada 1: o histórico como Commit[] tipados, do mais recente
// ao mais antigo.
export async function readCommits(repoPath: string): Promise<Commit[]> {
  try {
    const raw = await runGit(repoPath, [
      "log",
      "--numstat",
      "--pretty=format:" + LOG_FORMAT,
    ]);
    return parseLog(raw);
  } catch (err) {
    // Repo sem commits faz o `git log` falhar. Confirmamos o caso à prova de
    // idioma: rev-list --count responde "0" e sai com sucesso num repo vazio.
    const count = (await runGit(repoPath, ["rev-list", "--all", "--count"])).trim();
    if (count === "0") return [];
    throw err;
  }
}
