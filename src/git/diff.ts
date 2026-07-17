import { runGit } from "./run.js";

const lines = (out: string) => out.split("\n").filter(Boolean);

// A branch padrão do remoto (ex.: "main"), ou null se não houver origin/HEAD.
async function originDefault(repoPath: string): Promise<string | null> {
  try {
    const ref = await runGit(repoPath, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
    ]);
    return ref.trim().replace("refs/remotes/origin/", "");
  } catch {
    return null;
  }
}

// O commit-base: onde a branch atual divergiu da branch padrão. Se nada servir,
// cai para HEAD (aí o diff pega só o que não foi commitado).
async function findBase(repoPath: string): Promise<string> {
  for (const ref of [await originDefault(repoPath), "main", "master"]) {
    if (!ref) continue;
    try {
      return (await runGit(repoPath, ["merge-base", "HEAD", ref])).trim();
    } catch {
      // branch não existe aqui; tenta a próxima
    }
  }
  return "HEAD";
}

// Camada 1: os arquivos que a mudança atual tocou — commits desta branch desde
// a base MAIS o que ainda não foi commitado (working tree e arquivos novos).
export async function changedFiles(repoPath: string): Promise<string[]> {
  const base = await findBase(repoPath);

  const [diff, untracked] = await Promise.all([
    runGit(repoPath, ["diff", "--name-only", base]),
    runGit(repoPath, ["ls-files", "--others", "--exclude-standard"]),
  ]);

  return [...new Set([...lines(diff), ...lines(untracked)])];
}
