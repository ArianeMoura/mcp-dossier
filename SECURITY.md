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

`mcp-dossier` is a read-only MCP server: it runs `git` and reads files in the
repository it was launched in, and makes no network calls. Reports that are
in scope include anything that lets an MCP client or a repository read outside
that repository, execute code, or exhaust the host process.

Pointing the server at a repository you don't trust is outside the threat model
it can fully defend — a repository controls its own `.git/config`. The server
disables the known configuration-driven execution vectors, but treat an
untrusted repository as untrusted input.
