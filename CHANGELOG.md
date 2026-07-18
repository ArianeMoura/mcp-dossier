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
