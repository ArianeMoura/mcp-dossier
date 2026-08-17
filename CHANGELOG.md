# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [SemVer](https://semver.org/).

## [Unreleased]

### Added

- `MCP_DOSSIER_MAX_COMMITS` reads only the newest N commits instead of the whole
  history. It has no default, so nothing changes unless you ask for it. On React
  capping at 5,000 of the 21,639 commits roughly halves the history pass, and
  the commit count in `repo_briefing` says which you got.
- `review_gap` takes `minStrength`, dropping suggestions weaker than the
  coupling ratio you give. The analysis accepted it from the start and the tool
  never passed it, so it sat at 0.
- `bench/` runs the benchmark behind the numbers in the README, against four
  projects it clones for you.

### Fixed

- Pointing `MCP_DOSSIER_REPO` at a subdirectory returned nothing: `hotspots`
  answered "No hotspots found." and `review_gap` "No obvious gap", with no
  error. git reports paths from the work tree root, so joining them onto
  the configured subdirectory found no file. The path now resolves to the root
  before anything reads it, which also rejects a bare repository instead of
  serving empty answers from one.
- The index trusted `git log`'s ordering, which is by commit date, while every
  analysis reads the author date a `Commit` carries. A rebase or cherry-pick
  makes the two disagree, in 5,960 of React's 21,638 commits. `repo_briefing`
  had been dating React's first commit a day late as a result.
- `review_gap` failed outright on a repository with no commits, where the other
  tools answered normally.
- A blank environment variable refused to start the server, because an empty
  string coerces to 0 and fails every bound. `FOO=` in a compose file or an
  env_file is common and nobody means zero by it.
- Concurrent first calls each ran the full history scan and built their own
  index. On React that was two 17-second passes at once.
- `review_gap` probed every suggestion for existence through an unbounded
  `Promise.all`, which a branch touching thousands of files turns into `EMFILE`.
- Indentation counted a tab as one column and four spaces as four, ranking a
  tab-indented file about four times lower than an equally nested one.
- A commit dated in the future rendered as "first touched -354000d ago".
- `limit` advertised a default the schema never applied, leaving each call site
  to repeat it. Clients now see `"default": 10` in the tool schema.
- Removed files kept shipping in the published package, because `tsc` doesn't
  clear stale output and `files` publishes whatever is in `dist`.

### Changed

- `hotspots` only considers files git tracks at HEAD. Its candidate set was
  every path history had ever seen, and on React 19,392 of those 26,594 paths
  are deleted files whose reads could only fail. Asking `git ls-files` costs
  10ms and takes the working tree read from 536ms to 318ms, which is most of
  what a session pays after its first call: warm on React drops from 0.51s to
  0.33s. It also settles case. A rename that changed only capitalization leaves
  both spellings in history, and where the filesystem ignores case — macOS,
  Windows — both resolved to the same file and ranked it twice, splitting its
  churn. Express has one, `test/res.sendFile.js`.
- The index reads `git log --name-status` instead of `--numstat`. Line counts
  cost a blob diff per commit, which was 12.6s of React's history against 0.8s
  for asking the trees which paths changed, and only `ownership` ever read them.
  A cold `repo_briefing` on React drops from 17.6s to 1.4s and vite from 4.6s to
  0.5s, and the index holds 54.9 MB of React where it held 62.4 MB. Owners come
  out unchanged, because the weighting didn't.
- `file_dossier` fetches the line counts for the file it was asked about, naming
  the commits the index says touched it rather than walking history behind a
  pathspec. Walking is nearly all of the cost: on React a pathspec pays 253ms to
  reach one file's 769 commits where naming them costs 45ms, and the price then
  follows the file's history instead of the repository's. Naming them also
  sidesteps the history simplification a pathspec turns on, which hid 10 of the
  281 commits the index has for Fastify's `lib/reply.js` — each of which would
  have weighed nothing.
- `runGit` closes stdin on every call and can write to it. A subcommand that
  reads stdin used to hang until the timeout; `git log --stdin` now takes its
  revisions there, where an argument list would have run to tens of kilobytes.
- `--literal-pathspecs` joins the git hardening, now that a tool argument
  reaches a pathspec: without it a path opening with `:` reads as pathspec magic
  rather than as a file.
- `bench/` reports what `file_dossier` costs over a warm index and what the
  index holds after a forced GC, which unlike peak RSS doesn't swing by tens of
  megabytes with V8's collection timing. Peak RSS is now sampled before the
  raw-log comparison the benchmark does for the token column, so it stops
  charging the server for the harness. The projects `--clone` fetches into
  `bench/repos/` are also no longer picked up by this repository's lint and test
  runs.
- `hotspots` computes each file's complexity as it reads it, rather than holding
  every file's text until the whole tree has been read. Peak on React drops from
  212 MB to 156 MB.
- `diff.relative=false` joins the git hardening: it is repository-controlled
  config that changes how paths are printed.
- CI type-checks the tests, runs type-aware lint rules, and covers macOS and
  Windows as well as Ubuntu.

## [0.1.1] - 2026-08-14

### Fixed

- Every tool failed on a repository past roughly 20k commits. The 15s default
  timeout expired partway through the `log --numstat` pass, which takes 16s on
  React before any analysis runs. The default is now 120s, and the 600s cap
  still bounds a hung git.
- A timeout reported the same opaque message as every other failure, so the one
  setting that fixes it went unnamed. It now says what expired and which
  variable raises it, without echoing the git arguments, since a ref read from
  repository data can reach that list.

## [0.1.0] - 2026-08-11

### Added

- `MCP_DOSSIER_REPO` names the repository to analyze. The previous behavior was
  to read whatever the process's working directory happened to be, and since
  clients spawn servers from their own install directory, that pointed the
  server at no repository at all in the most common setup.

### Changed

- The repository path is resolved once at startup and injected into the
  handlers, which no longer read `process.cwd()` themselves. A path that isn't a
  git repository now fails at startup with the variable to set, instead of
  surfacing as a git error on every call.
- `@modelcontextprotocol/sdk` now requires `^1.30.0`, which allows the patched
  `@hono/node-server` and `fast-uri`. Neither was reachable over stdio, but they
  no longer ship in the dependency tree.
- Development moved to ESLint 10; CI also runs on Node 24.

### Fixed

- `review_gap` reported only uncommitted work when the default branch existed
  solely as a remote ref — a single-branch clone, a worktree, a CI checkout. The
  base was derived from `origin/HEAD` but stripped down to a local branch name
  that resolved nowhere, so it silently fell back to `HEAD`.
- `hotspots` followed a symlinked directory out of the repository. The 0.0.1
  fix guarded the last path component only, so an intermediate one still walked
  outside: a directory swapped for a symlink after the commit.
- The `dossier://file/{+path}` resource applied no length bound and echoed the
  path back, so it sidestepped the cap the equivalent tool argument enforces.
- Counts of one no longer read "1 commits": one pluralization rule now serves
  every formatter.
- The server reported a hardcoded version on handshake instead of the one in
  `package.json`.
- `repo_briefing` rejected a call that omitted `arguments`, which the protocol
  allows for a tool that takes no input.

## [0.0.1] - 2026-07-30

### Added

- Git adapter (layer 1): reads history via `spawn`, parses with control-char
  delimiters, per-file churn via `--numstat`.
- In-memory index with per-session cache and HEAD-based invalidation (layer 2).
- Analyses (layer 3): temporal coupling, hotspot (churn × indentation
  complexity), ownership with half-life decay, risk.
- MCP tools: `coupled_files`, `file_dossier`, `hotspots`, `repo_briefing`,
  `review_gap`.
- Resources: `dossier://repo`, `dossier://file/{+path}`, `dossier://hotspots`.
- Prompts: `onboard-me`, `review-my-branch`, `standup`.
- `SECURITY.md` with a private reporting channel and the threat model.

### Security

- Every git call now runs with `core.fsmonitor=false`, so a repository can no
  longer name an executable in its own `.git/config` and have it run.
- The child process no longer inherits `GIT_DIR`, `GIT_EXTERNAL_DIFF` and
  related variables, which could redirect git away from the target repository.
- `hotspots` skips symlinks instead of following them out of the repository.
- Refs derived from repository data are passed after `--end-of-options`, so one
  starting with `-` can't be read as an option.

### Fixed

- Author names and subjects with non-ASCII characters were corrupted when a
  multi-byte character fell on a stream chunk boundary.
- Non-ASCII paths came back octal-escaped, so they matched no real file.
- A rename entered the index as a single `old => new` key that matched no file;
  it is now recorded as two paths.
- `hotspots` read the entire working tree at once, with no concurrency, size or
  binary limits — enough to exhaust descriptors or memory on a large repository.
- `git` output is now capped, and `MCP_DOSSIER_GIT_TIMEOUT_MS` has an upper
  bound, so neither can silently disable the guard it configures.

[unreleased]: https://github.com/ArianeMoura/mcp-dossier/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ArianeMoura/mcp-dossier/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ArianeMoura/mcp-dossier/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/ArianeMoura/mcp-dossier/releases/tag/v0.0.1
