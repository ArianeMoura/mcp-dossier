/**
 * Camada 1 — parse do `git log`. Tudo aqui é PURO: recebe string, devolve
 * objetos. Zero I/O, zero git. É por isso que dá pra testar com fixtures.
 */

// Os delimitadores invisíveis. Ficam AQUI, junto do parse, para serem a
// fonte única da verdade: LOG_FORMAT (que o git emite) e o split (que o
// parse faz) precisam concordar, senão o parse se desalinha.
export const US = "\x1f"; // Unit Separator (0x1F): separa CAMPOS dentro de um commit
export const RS = "\x1e"; // Record Separator (0x1E): separa um COMMIT do outro

// A string que runGit passa pro git, JUNTO com --numstat. Repare que o RS
// (%x1e) agora vai no COMEÇO: ele marca "aqui começa um commit". Assim,
// quebrar a saída no RS devolve blocos auto-contidos — o cabeçalho + as
// linhas de arquivo daquele commit, grudadas. A ordem dos campos aqui dita
// a ordem em que parseLog vai lê-los.
export const LOG_FORMAT = "%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s";

// Um arquivo tocado por um commit, com o churn (linhas +/-) do --numstat.
export type FileChange = {
  path: string; // caminho do arquivo, relativo à raiz do repo
  added: number; // linhas adicionadas (0 para arquivo binário)
  removed: number; // linhas removidas (0 para arquivo binário)
};

export type Commit = {
  hash: string; // %H  — identidade única do commit
  author: string; // %an — nome do autor
  email: string; // %ae — email; a identidade ESTÁVEL da pessoa
  date: Date; // %aI — data do autor, já convertida para Date
  subject: string; // %s  — a primeira linha da mensagem
  files: FileChange[]; // os arquivos que este commit mexeu (via --numstat)
};

/**
 * Converte o stdout cru do `git log --pretty=format:LOG_FORMAT` numa lista
 * de Commit.
 *
 * @param raw  o texto cru vindo do git
 * @returns    um Commit por registro, na ordem em que o git os emitiu
 */

export function parseLog(raw: string): Commit[] {
  return raw
    .split(RS)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lines = part
        .split("\n")
        .filter(Boolean);

      const fields = lines[0].split(US);

      const files = lines.slice(1).map((line) => {
        const [added, removed, path] = line.split("\t");

        return {
          path,
          added: Number(added) || 0,
          removed: Number(removed) || 0,
        };
      });

      return {
        hash: fields[0],
        author: fields[1],
        email: fields[2],
        date: new Date(fields[3]),
        subject: fields[4],
        files,
      };
    });
}