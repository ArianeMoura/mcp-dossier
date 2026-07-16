// Camada 1: parse puro do `git log`. Recebe string, devolve objetos — sem I/O.

// Delimitadores de controle: não aparecem em nome, email nem mensagem, então
// nunca viram separador falso. US separa campos; RS separa commits.
export const US = "\x1f";
export const RS = "\x1e";

// Formato do `git log`, usado com --numstat. O RS vai no COMEÇO de cada commit
// para que quebrar a saída no RS devolva blocos auto-contidos (cabeçalho + as
// linhas de arquivo daquele commit).
export const LOG_FORMAT = "%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s";

export type FileChange = {
  path: string;
  added: number; // 0 para arquivo binário
  removed: number; // 0 para arquivo binário
};

export type Commit = {
  hash: string;
  author: string;
  email: string; // identidade estável da pessoa (o nome pode variar)
  date: Date;
  subject: string;
  files: FileChange[];
};

export function parseLog(raw: string): Commit[] {
  return raw
    .split(RS)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lines = part.split("\n").filter(Boolean);
      const fields = lines[0].split(US);

      const files = lines.slice(1).map((line) => {
        const [added, removed, path] = line.split("\t");
        return {
          path,
          added: Number(added) || 0, // numstat mostra "-" em binário → 0
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
