# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Git adapter (layer 1): reads history via `spawn`, parses with control-char
  delimiters, per-file churn via `--numstat`.
- In-memory index with per-session cache and HEAD-based invalidation (layer 2).
- Analyses (layer 3): temporal coupling, hotspot (churn × indentation
  complexity), ownership with half-life decay, risk.
- MCP tools: `coupled_files`, `file_dossier`, `hotspots`, `repo_briefing`,
  `review_gap`.
- Resources: `dossier://repo`, `dossier://file/{path}`, `dossier://hotspots`.
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
