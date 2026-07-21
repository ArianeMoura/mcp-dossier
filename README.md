# mcp-dossier

[![CI](https://github.com/ArianeMoura/mcp-dossier/actions/workflows/ci.yml/badge.svg)](https://github.com/ArianeMoura/mcp-dossier/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Archaeological intelligence about a git repository, over the
[Model Context Protocol](https://modelcontextprotocol.io). It doesn't act on
your code — it answers questions about its history.

Every MCP server is a verb: create an issue, run a query, send a message. None
is a noun: _tell me about this._ Agents have plenty of actions and almost no
context. `mcp-dossier` fills that gap — from local git history alone, with no
API keys and no network.

## Why not just `git log`?

An agent can already run `git log`. But it doesn't know _what to compute_ —
temporal coupling, hotspots, and ownership decay each need a pass over the whole
history — and the raw log costs tens of thousands of tokens where a dossier
returns ~200 of signal.

## Install

No configuration; it analyzes the repository it's launched in. Point your MCP
client at `npx`:

```json
{
  "mcpServers": {
    "dossier": { "command": "npx", "args": ["-y", "mcp-dossier"] }
  }
}
```

One optional knob: `MCP_DOSSIER_GIT_TIMEOUT_MS` caps any single git call
(default `15000`). A git process that outlives it is killed, so a request can't
hang the server.

## Tools

| tool            | answers                                        |
| --------------- | ---------------------------------------------- |
| `file_dossier`  | everything the history knows about a file      |
| `coupled_files` | what changes together with a file              |
| `review_gap`    | what you forgot to touch on the current branch |
| `hotspots`      | where churn and complexity concentrate         |
| `repo_briefing` | a get-me-up-to-speed overview                  |

Plus resources (`dossier://repo`, `dossier://file/{path}`,
`dossier://hotspots`) and prompts (`onboard-me`, `review-my-branch`,
`standup`).

The signature tool is `review_gap`. It finds what historically changes with your
branch's edits and subtracts what you already touched — the files you likely
forgot:

```
Usually change together with what you touched, and you didn't:

  100% (12x) src/auth.test.ts — with src/auth.ts
   82% (9x)  src/session.ts — with src/auth.ts
```

## How it works

Layered — git adapter → in-memory index → analysis → MCP surface — and
heuristic:

- **Coupling** — files that change together, directionally.
- **Hotspot** — churn × complexity, using indentation as a language-agnostic
  proxy for nesting.
- **Ownership** — lines weighted by a six-month recency half-life.
- **Risk** — churn, bugfix ratio, author count, and recency.

These are proxies, not science: the bugfix regex is naive, indentation misreads
flat or data-heavy files, and the thresholds are arbitrary.

## Privacy

Output includes commit author names and emails, read from `git log` — the same
data already public in the repository, used only to attribute ownership and
activity. Nothing is logged, nothing leaves the machine (no network calls), and
state lives only in an in-memory index for the session.

## Development

Requires Node ≥ 20.12.

```sh
npm install
npm run build
npm run lint
npm test
```

To try a local build, register `node dist/index.js` in your MCP client instead
of `npx`. It speaks stdio and analyzes whatever repository it's launched in.

## License

[MIT](LICENSE)
