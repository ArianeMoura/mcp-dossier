// Control-char delimiters: they never appear in a name, email, or message, so
// they can't be mistaken for a separator. US splits fields; RS splits commits.
export const US = "\x1f";
export const RS = "\x1e";

// `git log` format, used with --numstat. RS goes at the START of each commit so
// that splitting the output on RS yields self-contained blocks (the header plus
// that commit's file lines).
export const LOG_FORMAT = "%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s";

export type FileChange = {
  path: string;
  added: number; // 0 for a binary file
  removed: number; // 0 for a binary file
};

export type Commit = {
  hash: string;
  author: string;
  email: string; // stable identity of a person (the display name may vary)
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
          added: Number(added) || 0, // numstat shows "-" for binary files → 0
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
