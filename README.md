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

One call, `file_dossier` on Fastify's reply handler, with the addresses elided:

```
lib/reply.js

  281 commits · 93 authors · first touched 3475d ago · last touched 2d ago
  risk 32377.2 (churn 281 · 25% bugfix · 93 authors)

  Who knows it:
    80  Matteo Collina <…>
    36  Manuel Spigolon <…>
    27  KaKa <…>

  Changes together with:
    26% (73x) test/internals/reply.test.js
    18% (49x) fastify.js
    16% (44x) lib/handleRequest.js
    11% (31x) test/hooks.test.js
    11% (30x) test/reply-error.test.js

  Recent commits:
    feat: add `Reply.prototype.mediaType` (#6932)
    fix: remove raw response headers (#6860)
    fix: clear trailer state when removing all trailers (#6845)
```

Its strongest coupling is its own test file, pulled in by roughly one change in
four.

## Why not just `git log`?

An agent can already run `git log`, but it doesn't know _what to compute_.
Temporal coupling, hotspots and ownership decay each need a pass over the whole
history. That raw log runs to millions of tokens on a large project, where a
dossier answers in under two hundred.

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

Point it at your project, not at the server. Clients spawn servers from their
own install directory, so without `MCP_DOSSIER_REPO` the server reads whatever
that happens to be.

## Configuration

| variable                     | default     | effect                         |
| ---------------------------- | ----------- | ------------------------------ |
| `MCP_DOSSIER_REPO`           | working dir | the repository to analyze      |
| `MCP_DOSSIER_GIT_TIMEOUT_MS` | `120000`    | ceiling on any single git call |
| `MCP_DOSSIER_MAX_COMMITS`    | unset       | read only the newest N commits |

A subdirectory works for `MCP_DOSSIER_REPO`; the server resolves it to the
repository root. If the path isn't a git repository, it says so and exits rather
than failing once per call. Give an absolute path: a relative one resolves
against the server's working directory, which is rarely yours.

The timeout kills a git process that outlives it, so a request can't hang the
server. Values above `600000` are rejected at startup. See [bench/](bench/) for
what the default covers.

`MCP_DOSSIER_MAX_COMMITS` is a trade, not a tuning knob. On React, capping at
5,000 of the 21,638 commits roughly halves the history pass, but coupling and
ownership then only see what that window contains. The commit count in
`repo_briefing` tells you which you got.

## Troubleshooting

**The server exits with "not a git repository".** Either it was launched outside
one, or the path in `MCP_DOSSIER_REPO` doesn't exist.

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

`review_gap` finds what historically changes with your branch's edits, subtracts
what you already touched, and reports the rest:

```
Usually change together with what you touched, and you didn't:

  100% (12x) src/auth.test.ts — with src/auth.ts
  82% (9x) src/session.ts — with src/auth.ts
```

## How it works

Four layers: a git adapter, an in-memory index, the analyses, and the MCP
surface. Each analysis is a heuristic.

- Coupling counts how often two files change in the same commit, as a fraction
  of the target's own changes, so it reads in one direction.
- Hotspot multiplies churn by complexity, using average indentation as a
  language-agnostic proxy for nesting.
- Ownership weights each author's lines by a six-month recency half-life.
- Risk combines churn, bugfix ratio, author count and recency.

These are proxies, not science: the bugfix regex is naive, indentation misreads
flat or data-heavy files, and the thresholds are arbitrary. Churn alone can
carry a file to the top, which is why React's highest-ranked hotspot is its
`package.json`.

History is read from the current branch's ancestry, so commits that live only on
other branches don't count toward coupling or ownership.

## Scale

One `repo_briefing`, across five open-source projects. Method and machine in
[bench/](bench/), which you can run yourself.

| repo    | commits | file changes | cold |  warm | dossier | index heap | peak RSS | tokens out | vs raw log |
| ------- | ------: | -----------: | ---: | ----: | ------: | ---------: | -------: | ---------: | ---------: |
| got     |   1,664 |        5,163 | 0.1s | 0.03s |    24ms |       8 MB |    69 MB |        103 |     1,096× |
| fastify |   4,852 |       11,107 | 0.2s | 0.05s |    53ms |      11 MB |    72 MB |         93 |     4,618× |
| express |   6,158 |       12,271 | 0.1s | 0.03s |    42ms |      12 MB |    72 MB |        101 |     3,637× |
| vite    |   9,571 |       41,698 | 0.5s | 0.16s |    83ms |      20 MB |   114 MB |        111 |     8,370× |
| react   |  21,639 |      145,853 | 1.4s | 0.33s |    49ms |      53 MB |   154 MB |        136 |    36,475× |

Output size barely moves while the input grows 44×. Cold cost tracks file
changes rather than commits: React averages 6.7 changed files per commit where
express averages 2.0, which is why per-commit estimates vary so much more than
per-change ones. The index is cached per session and keyed on HEAD, so every
call after the first is warm until you commit.

The dossier column is what `file_dossier` adds on top of a warm index. It is the
only call left that reads line counts, which ownership weights an author by, and
it reads them only for the commits that touched the file it was asked about — so
it grows with that file's history, not the repository's. Index heap is what
holding the history costs; peak RSS is higher because the hotspot ranking reads
the working tree.

## Privacy

Output includes commit author names and emails, read from `git log`. That is the
same data already public in the repository, used here only to attribute
ownership and activity.

There are no network calls, and nothing is written to disk: state lives in an
in-memory index for the length of the session. Diagnostics go to stderr, which
your MCP client typically captures in its own log, and a failing git command is
logged there with its output, which can include absolute paths. The client
receives a sanitized message.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the checks CI runs.

To try a local build, register `node dist/index.js` in your MCP client instead
of `npx`, with the same `MCP_DOSSIER_REPO` in `env`.

## License

[MIT](LICENSE)
