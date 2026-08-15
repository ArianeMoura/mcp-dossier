# mcp-dossier

[![npm](https://img.shields.io/npm/v/mcp-dossier)](https://www.npmjs.com/package/mcp-dossier)
[![CI](https://github.com/ArianeMoura/mcp-dossier/actions/workflows/ci.yml/badge.svg)](https://github.com/ArianeMoura/mcp-dossier/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Archaeological intelligence about a git repository, over the
[Model Context Protocol](https://modelcontextprotocol.io). It doesn't act on
your code — it answers questions about its history.

Every MCP server is a verb: create an issue, run a query, send a message. None
is a noun: _tell me about this._ Agents have plenty of actions and almost no
context. `mcp-dossier` fills that gap — from local git history alone, with no
API keys and no network.

One call — `file_dossier` on React's reconciler, verbatim:

```
packages/react-reconciler/src/ReactFiberCommitWork.js

  283 commits · 40 authors · first touched 3221d ago · last touched 1d ago
  risk 12750.6 (churn 283 · 13% bugfix · 40 authors)

  Who knows it:
    686  Sebastian Markbåge <sebastian@calyptus.eu>
    154  ronnakamoto <14256602+ronnakamoto@users.noreply.github.com>
    154  Josh Story <gnoff@storyposted.com>

  Changes together with:
    29% (68x) packages/react-reconciler/src/ReactFiberBeginWork.js
    28% (65x) packages/react-reconciler/src/ReactFiberCompleteWork.js
    20% (46x) packages/react-reconciler/src/ReactFiberWorkLoop.js
    18% (41x) packages/react-reconciler/src/ReactFiber.js
    17% (40x) packages/react-reconciler/src/ReactFiberScheduler.js

  Recent commits:
    [DOM] Scope Fragment once listeners to the fragment, not each child (#37169)
    [Fiber] Run Fragment deletion effects for HostText children (#37168)
    [Fiber] Extract Fragment instance commit helpers into their own module (#37167)
```

The file itself shows none of this.

## Why not just `git log`?

An agent can already run `git log`. But it doesn't know _what to compute_ —
temporal coupling, hotspots, and ownership decay each need a pass over the whole
history — and the raw log costs tens of thousands of tokens where a dossier
returns ~200 tokens of signal.

## Install

Requires Node ≥ 20.12 and `git` on `PATH`. Point your MCP client at `npx`:

```json
{
  "mcpServers": {
    "dossier": {
      "command": "npx",
      "args": ["-y", "mcp-dossier"],
      "env": { "MCP_DOSSIER_REPO": "/path/to/your/project" }
    }
  }
}
```

`MCP_DOSSIER_REPO` names the repository to analyze. Omit it and the server reads
its own working directory, which is what you want from a project shell and
almost never what you want from an MCP client, since clients spawn servers from
their own install directory. A subdirectory works too; the server resolves it to
the repository root. If the path isn't a git repository at all, the server says
so and exits rather than failing once per call.

`MCP_DOSSIER_GIT_TIMEOUT_MS` caps any single git call, defaulting to `120000`.
A git process that outlives it is killed, so a request can't hang the server.
Values above `600000` are rejected at startup rather than clamped, so the cap
can't be raised until it stops being a cap.

## Troubleshooting

**The server exits with "not a git repository".** Either it was launched outside
one, which is what happens when a client spawns it from its own install
directory, or the path in `MCP_DOSSIER_REPO` doesn't exist. Set the variable to
an absolute path: a relative one resolves against the server's working
directory, which is rarely yours.

**"Reading this repository's history took longer than…"** The repository is
bigger than the default budget. Raise `MCP_DOSSIER_GIT_TIMEOUT_MS`.

**"Invalid environment configuration".** A variable failed validation and the
server refused to start rather than run with a setting that doesn't hold. The
message names the variable.

## Tools

| tool            | takes                  | answers                                        |
| --------------- | ---------------------- | ---------------------------------------------- |
| `file_dossier`  | `path`                 | everything the history knows about a file      |
| `coupled_files` | `path`, `limit`        | what changes together with a file              |
| `review_gap`    | `limit`, `minStrength` | what you forgot to touch on the current branch |
| `hotspots`      | `limit`                | where churn and complexity concentrate         |
| `repo_briefing` | —                      | a get-me-up-to-speed overview                  |

`path` is relative to the repository root. `limit` is optional, 1–100, and
defaults to 10. `minStrength` is optional, 0–1, and defaults to 0: it drops
suggestions whose coupling is weaker than the ratio you give.

Plus resources (`dossier://repo`, `dossier://file/{+path}`,
`dossier://hotspots`) and prompts (`onboard-me`, `review-my-branch`,
`standup`).

The signature tool is `review_gap`. It finds what historically changes with your
branch's edits and subtracts what you already touched — the files you likely
forgot:

```
Usually change together with what you touched, and you didn't:

  100% (12x) src/auth.test.ts — with src/auth.ts
  82% (9x) src/session.ts — with src/auth.ts
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
flat or data-heavy files, and the thresholds are arbitrary. Churn alone can
carry a file — React's top hotspot is its `package.json`, touched by every
dependency bump.

History is read from the current branch's ancestry, so commits that live only on
other branches don't count toward coupling or ownership.

## Scale

Measured against React — 21,638 commits, 7,202 tracked files, 1.0 GB of `.git`:

| tool            | cold  | warm | peak RSS |
| --------------- | ----- | ---- | -------- |
| `repo_briefing` | 24.3s | 1.1s | 207 MB   |
| `hotspots`      | 17.2s | 1.0s | 222 MB   |

Almost all of the cold cost is a single `log --numstat` pass. The index is
cached per session and keyed on HEAD, so every later call is warm until you
commit.

## Privacy

Output includes commit author names and emails, read from `git log` — the same
data already public in the repository, used only to attribute ownership and
activity.

Nothing leaves the machine: there are no network calls, and nothing is written
to disk. State lives only in an in-memory index for the session. Diagnostics go
to stderr, which your MCP client typically captures in its own log; a failing
git command is logged there with its output, which can include absolute paths.
The client only ever receives a sanitized message.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the checks CI runs.

To try a local build, register `node dist/index.js` in your MCP client instead
of `npx`, with the same `MCP_DOSSIER_REPO` in `env`.

## License

[MIT](LICENSE)
