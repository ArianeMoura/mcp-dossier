# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [SemVer](https://semver.org/).

## [Unreleased]

### Changed

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
  fix guarded the last path component only, which left an intermediate one — a
  directory swapped for a symlink after the commit — still walking outside.

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

[unreleased]: https://github.com/ArianeMoura/mcp-dossier/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/ArianeMoura/mcp-dossier/releases/tag/v0.0.1
