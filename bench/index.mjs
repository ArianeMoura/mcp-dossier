// See bench/README.md for what these numbers mean and how they were produced.
import { execFileSync, execFileSync as run } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const self = join(here, "index.mjs");

const DEFAULTS = [
  "https://github.com/sindresorhus/got.git",
  "https://github.com/fastify/fastify.git",
  "https://github.com/expressjs/express.git",
  "https://github.com/vitejs/vite.git",
];

const REPOS = join(here, "repos");

// One warm-up plus this many measured runs. The first run of a batch pays for
// the OS file cache and reads 40% slower, which is noise, not the server.
const RUNS = 5;

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
      run("git", ["clone", "-q", url, path], { stdio: "inherit" });
    }
    return path;
  });
}

// One repo, one process, so the index cache starts empty and maxRSS belongs to
// this repository alone.
async function once(repo) {
  const dist = (m) => import(`file://${join(here, "..", "dist", m)}`);
  const { getIndex } = await dist("repo-index/get.js");
  const { buildRepoBriefing } = await dist("analysis/briefing.js");
  const { hotspots } = await dist("analysis/hotspot.js");
  const { formatRepoBriefing } = await dist("tools/repo-briefing.js");

  const briefing = async () => {
    const index = await getIndex(repo, { timeoutMs: 600_000 });
    const spots = (await hotspots(repo, { timeoutMs: 600_000 })).slice(0, 5);
    return { text: formatRepoBriefing(buildRepoBriefing(index), spots), index };
  };

  const cold0 = performance.now();
  const { text, index } = await briefing();
  const cold = performance.now() - cold0;

  // Second call hits the HEAD-keyed cache: what a session pays after the first
  // question.
  const warm0 = performance.now();
  await briefing();
  const warm = performance.now() - warm0;

  const raw = execFileSync("git", ["-C", repo, "log", "--numstat"], {
    maxBuffer: 2 ** 30,
    encoding: "utf8",
  });

  return {
    commits: index.commits.length,
    changes: index.commits.reduce((n, c) => n + c.files.length, 0),
    cold,
    warm,
    rssMb: process.resourceUsage().maxRSS / 1024,
    // ~4 chars per token is close enough to size the difference.
    outTok: Math.round(text.length / 4),
    rawTok: Math.round(raw.length / 4),
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function measure(repo) {
  const runs = [];
  for (let i = 0; i <= RUNS; i++) {
    const out = run("node", [self, "--once", repo], { encoding: "utf8" });
    if (i > 0) runs.push(JSON.parse(out));
  }
  const of = (k) => median(runs.map((r) => r[k]));
  return {
    repo: repo.split(/[/\\]/).pop(),
    ...runs[0],
    cold: of("cold"),
    warm: of("warm"),
    rssMb: of("rssMb"),
    usPerChange: (of("cold") * 1000) / runs[0].changes,
  };
}

const args = process.argv.slice(2);

if (args[0] === "--once") {
  console.log(JSON.stringify(await once(resolve(args[1]))));
  process.exit(0);
}

const repos = args[0] === "--clone" ? clone() : args.map((a) => resolve(a));

if (repos.length === 0) {
  process.stderr.write("usage: node bench/index.mjs [--clone | <repo>...]\n");
  process.exit(1);
}

const rows = [];
for (const repo of repos) {
  process.stderr.write(`measuring ${repo.split(/[/\\]/).pop()}\n`);
  rows.push(measure(repo));
}

const n = (x, d = 0) => x.toLocaleString("en-US", { maximumFractionDigits: d });

console.log(
  `| repo | commits | file changes | cold | warm | µs/change | peak RSS | tokens out | vs raw log |`,
);
console.log("| --- | --: | --: | --: | --: | --: | --: | --: | --: |");
for (const r of rows) {
  console.log(
    `| ${r.repo} | ${n(r.commits)} | ${n(r.changes)} | ${n(r.cold / 1000, 1)}s | ` +
      `${n(r.warm / 1000, 2)}s | ${n(r.usPerChange)} | ${n(r.rssMb)} MB | ` +
      `${n(r.outTok)} | ${n(r.rawTok / r.outTok)}× |`,
  );
}
