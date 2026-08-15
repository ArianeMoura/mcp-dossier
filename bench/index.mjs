// See bench/README.md for what these numbers mean and how they were produced.
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = (m) => import(`file://${join(here, "..", "dist", m)}`);

const { getIndex } = await dist("repo-index/get.js");
const { buildRepoBriefing } = await dist("analysis/briefing.js");
const { hotspots } = await dist("analysis/hotspot.js");
const { formatRepoBriefing } = await dist("tools/repo-briefing.js");

const DEFAULTS = [
  "https://github.com/sindresorhus/got.git",
  "https://github.com/fastify/fastify.git",
  "https://github.com/expressjs/express.git",
  "https://github.com/vitejs/vite.git",
];

const REPOS = join(here, "repos");

function clone() {
  mkdirSync(REPOS, { recursive: true });
  return DEFAULTS.map((url) => {
    const name = url
      .split("/")
      .pop()
      .replace(/\.git$/, "");
    const path = join(REPOS, name);
    if (!existsSync(path)) {
      process.stderr.write(`cloning ${name}\n`);
      execFileSync("git", ["clone", "-q", url, path], { stdio: "inherit" });
    }
    return path;
  });
}

async function briefing(repo) {
  const index = await getIndex(repo, { timeoutMs: 600_000 });
  const spots = (await hotspots(repo, { timeoutMs: 600_000 })).slice(0, 5);
  return { text: formatRepoBriefing(buildRepoBriefing(index), spots), index };
}

async function measure(repo) {
  const cold0 = performance.now();
  const { text, index } = await briefing(repo);
  const cold = performance.now() - cold0;

  // Second call hits the HEAD-keyed cache: what a session pays after the first
  // question.
  const warm0 = performance.now();
  await briefing(repo);
  const warm = performance.now() - warm0;

  const raw = execFileSync("git", ["-C", repo, "log", "--numstat"], {
    maxBuffer: 2 ** 30,
    encoding: "utf8",
  });

  const commits = index.commits.length;
  const changes = index.commits.reduce((n, c) => n + c.files.length, 0);

  return {
    repo: repo.split(/[/\\]/).pop(),
    commits,
    changes,
    cold,
    warm,
    usPerChange: (cold * 1000) / changes,
    rssMb: process.resourceUsage().maxRSS / 1024,
    // ~4 chars per token is close enough to size the difference.
    outTok: Math.round(text.length / 4),
    rawTok: Math.round(raw.length / 4),
  };
}

const args = process.argv.slice(2);
const repos = args[0] === "--clone" ? clone() : args.map((a) => resolve(a));

if (repos.length === 0) {
  process.stderr.write("usage: node bench/index.mjs [--clone | <repo>...]\n");
  process.exit(1);
}

const rows = [];
for (const repo of repos) {
  rows.push(await measure(repo));
}

const n = (x, d = 0) => x.toLocaleString("en-US", { maximumFractionDigits: d });

console.log(
  "| repo | commits | file changes | cold | warm | µs/change | peak RSS | tokens out | vs raw log |",
);
console.log("| --- | --: | --: | --: | --: | --: | --: | --: | --: |");
for (const r of rows) {
  console.log(
    `| ${r.repo} | ${n(r.commits)} | ${n(r.changes)} | ${n(r.cold / 1000, 1)}s | ` +
      `${n(r.warm / 1000, 2)}s | ${n(r.usPerChange)} | ${n(r.rssMb)} MB | ` +
      `${n(r.outTok)} | ${n(r.rawTok / r.outTok)}× |`,
  );
}
