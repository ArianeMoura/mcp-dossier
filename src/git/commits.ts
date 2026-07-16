/**
 * Camada 1 — parse do `git log`. Tudo aqui é PURO: recebe string, devolve
 * objetos. Zero I/O, zero git. É por isso que dá pra testar com fixtures.
 */

// Os delimitadores invisíveis. Ficam AQUI, junto do parse, para serem a
// fonte única da verdade: LOG_FORMAT (que o git emite) e o split (que o
// parse faz) precisam concordar, senão o parse se desalinha.
export const US = "\x1f"; // Unit Separator (0x1F): separa CAMPOS dentro de um commit
export const RS = "\x1e"; // Record Separator (0x1E): separa um COMMIT do outro

// A string que runGit passa pro git. A ordem dos campos aqui dita a ordem
// em que parseLog vai lê-los.
export const LOG_FORMAT = "%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e";

export type Commit = {
  hash: string; // %H  — identidade única do commit
  author: string; // %an — nome do autor
  email: string; // %ae — email; a identidade ESTÁVEL da pessoa
  date: Date; // %aI — data do autor, já convertida para Date
  subject: string; // %s  — a primeira linha da mensagem
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
    const fields = part.split(US);

    return {
      hash: fields[0],
      author: fields[1],
      email: fields[2],
      date: new Date(fields[3]),
      subject: fields[4],
    };
  });
}
