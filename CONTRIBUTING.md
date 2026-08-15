# Contributing

Issues and pull requests are welcome. For a vulnerability, use the private
channel in [SECURITY.md](SECURITY.md) rather than an issue.

## Setup

Node ≥ 20.12 and `git` on `PATH`.

```sh
npm install
npm run build
```

## Before opening a pull request

Run what CI runs. It covers Ubuntu on Node 20, 22 and 24, plus macOS and
Windows.

```sh
npm run build
npm run typecheck
npm run lint
npm test
npm run format:check
```

`npm run format` fixes formatting. `npm run test:watch` and `npm run dev` watch
for changes.

## Tests

Most of the analyses are pure functions over an index, so you can call them with
a hand-built one and no repository at all. The ones that read a clock take
`now: Date` rather than calling it. `hotspots` is the exception: it reads the
working tree, and the pure half is `rankHotspots`.

Anything that shells out to git needs a real one.
`src/git/tmp-repo.testutil.ts` creates a throwaway repository with identity, GPG
and line endings pinned, so a test doesn't inherit whatever git config the
machine happens to have.

For the MCP surface, `src/server.test.ts` connects a real client over
`InMemoryTransport`. Calling a handler directly skips the schemas and the
sanitizing wrappers, so it tends to pass where the tool itself would fail.
