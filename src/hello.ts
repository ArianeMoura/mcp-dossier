import { basename } from "node:path";

export function formatHello(cwd: string, now: Date): string {
  const folderName = basename(cwd);
  const timestamp = now.toISOString();

  return `mcp-dossier vivo em ${folderName} (${cwd}) às ${timestamp}`;
}
