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

// One RS-delimited block → a Commit, or null if the header is malformed
// (missing fields or an unparseable date). Skipping beats crashing the scan on
// a single bad block.
function parseCommit(part: string): Commit | null {
  const lines = part.split("\n").filter(Boolean);
  const header = lines[0];
  if (header === undefined) return null;

  const [hash, author, email, date, subject] = header.split(US);
  if (
    hash === undefined ||
    author === undefined ||
    email === undefined ||
    date === undefined ||
    subject === undefined
  ) {
    return null;
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const files: FileChange[] = [];
  for (const line of lines.slice(1)) {
    const [added, removed, path] = line.split("\t");
    if (path === undefined) continue; // not a numstat line
    files.push({
      path,
      added: Number(added) || 0, // numstat shows "-" for binary files → 0
      removed: Number(removed) || 0,
    });
  }

  return { hash, author, email, date: parsedDate, subject, files };
}

export function parseLog(raw: string): Commit[] {
  return raw
    .split(RS)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseCommit)
    .filter((commit): commit is Commit => commit !== null);
}
