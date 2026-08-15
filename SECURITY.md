# Security Policy

## Supported versions

Only the latest published version receives fixes.

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/ArianeMoura/mcp-dossier/security/advisories/new).
Please don't open a public issue for a vulnerability.

Expect a first response within a week. If a report is accepted, the fix and the
advisory are published together.

## Scope

`mcp-dossier` is a read-only MCP server. It runs `git` and reads files in one
repository, named by `MCP_DOSSIER_REPO` or falling back to its working
directory, and makes no network calls. Reports in scope include anything that
lets an MCP client or a repository read outside that repository, execute code,
or exhaust the host process.

Pointing the server at a repository you don't trust is outside the threat model
it can fully defend, because a repository controls its own `.git/config`. The
server disables the configuration-driven execution vectors it knows about:
`core.fsmonitor`, inherited `GIT_*` variables, and paths that leave the work
tree through a symlink.
