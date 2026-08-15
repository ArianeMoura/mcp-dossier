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
| got     |   1,664 |        5,163 |  0.5s | 0.03s |       104 |    70 MB |        102 |     1,107× |
| fastify |   4,851 |       11,105 |  1.1s | 0.04s |        95 |   101 MB |         93 |     4,618× |
| express |   6,158 |       12,271 |  0.9s | 0.03s |        76 |   101 MB |        101 |     3,637× |
| vite    |   9,567 |       41,686 |  5.6s | 0.20s |       133 |   134 MB |        111 |     8,367× |
| react   |  21,638 |      145,847 | 16.5s | 0.98s |       113 |   241 MB |        136 |    36,473× |

React is not in the default set because it clones at 1.1 GB, eight times the
other four combined. To include it:

```sh
git clone https://github.com/facebook/react.git bench/repos/react
node bench/index.mjs bench/repos/*
```

## Reading the numbers

Cost tracks **file changes**, not commits. Per commit the spread across these
five is 4.7× (0.17ms to 0.80ms), because React averages 6.7 changed files per
commit where express averages 2.0. Per file change it narrows to 1.5×, which is
the number to use for an estimate.

`MCP_DOSSIER_GIT_TIMEOUT_MS` defaults to 120s. At the slowest rate observed that
covers roughly a million file changes, far past any repository these projects
represent.

Cold is the first call in a session. Every call after it hits the index cache,
keyed on HEAD, until you commit — that is the warm column, and it is what the
rest of a session pays.

Peak RSS is the process maximum, so it includes the whole working tree read the
hotspot ranking performs.
