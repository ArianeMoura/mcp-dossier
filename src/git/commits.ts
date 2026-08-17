// These never appear in a name, email or message, so they can't be mistaken for
// a separator. US splits fields; RS splits commits.
export const US = "\x1f";
export const RS = "\x1e";

// `git log` format, used with --name-status. RS goes at the START of each
// commit so that splitting on it yields self-contained blocks.
export const LOG_FORMAT = "%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s";

export type Commit = {
  hash: string;
  author: string;
  email: string; // stable identity of a person (the display name may vary)
  date: Date;
  subject: string;
  files: string[]; // paths touched, from the work tree root
};

// One block → a Commit, or null if the header is malformed — skipping a bad
// block beats crashing the whole scan.
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

  const files: string[] = [];
  for (const line of lines.slice(1)) {
    // "M\tpath". A path holding a tab arrives C-quoted, so the first tab is
    // always the one after the status letter.
    const tab = line.indexOf("\t");
    if (tab === -1) continue; // not a name-status line
    files.push(line.slice(tab + 1));
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
