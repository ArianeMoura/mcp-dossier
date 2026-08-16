# Benchmark

Times what a client actually waits for: one `repo_briefing` call, which builds
the index and ranks hotspots. It also measures the output against the raw
`git log --numstat` an agent would otherwise have to read.

```sh
npm run build
node bench/index.mjs --clone
```

`--clone` fetches four projects into `bench/repos/`, about 134 MB in total. Pass
paths instead to measure repositories you already have:

```sh
node bench/index.mjs ~/work/my-project ~/work/another
```

## Results

Apple M1, 8 cores, 8 GB, Node 20.19.1, git 2.45.0, macOS 26.3.

| repo    | commits | file changes |  cold |  warm | µs/change | peak RSS | tokens out | vs raw log |
| ------- | ------: | -----------: | ----: | ----: | --------: | -------: | ---------: | ---------: |
| got     |   1,664 |        5,163 |  0.4s | 0.03s |        80 |    68 MB |        103 |     1,096× |
| fastify |   4,851 |       11,105 |  0.9s | 0.05s |        82 |    79 MB |         93 |     4,618× |
| express |   6,158 |       12,271 |  0.9s | 0.04s |        74 |    82 MB |        101 |     3,637× |
| vite    |   9,567 |       41,686 |  4.6s | 0.20s |       110 |   109 MB |        111 |     8,367× |
| react   |  21,638 |      145,847 | 17.6s | 0.98s |       121 |   156 MB |        136 |    36,473× |

React is not in the default set because it clones at 1.1 GB, eight times the
other four combined. To include it:

```sh
git clone https://github.com/facebook/react.git bench/repos/react
node bench/index.mjs bench/repos/*
```

## Reading the numbers

Cost tracks **file changes**, not commits. Per commit the spread across these
five is 5.6× (0.15ms to 0.81ms), because React averages 6.7 changed files per
commit where express averages 2.0. Per file change it narrows to 1.6×, which is
the number to use for an estimate.

`MCP_DOSSIER_GIT_TIMEOUT_MS` defaults to 120s. At the slowest rate measured here
that covers about 990,000 file changes, close to seven times React's history.
`MCP_DOSSIER_MAX_COMMITS` is the other lever: it cuts the git pass roughly in
proportion, since that pass is where nearly all the cold time goes.

Cold is the first call in a session. Every call after it hits the index cache,
keyed on HEAD, until you commit. That is the warm column, and it is what the
rest of a session pays.

Peak RSS is the process maximum, so it includes the whole working tree read the
hotspot ranking performs.
