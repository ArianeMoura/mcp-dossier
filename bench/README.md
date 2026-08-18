# Benchmark

Times what a client actually waits for: one `repo_briefing` call, which builds
the index and ranks hotspots, plus one `file_dossier` on the file with the most
history, which is the only call that still reads line counts. It also measures
the output against the raw `git log --numstat` an agent would otherwise have to
read.

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

| repo    | commits | file changes | cold |  warm | dossier | µs/change | index heap | peak RSS | tokens out | vs raw log |
| ------- | ------: | -----------: | ---: | ----: | ------: | --------: | ---------: | -------: | ---------: | ---------: |
| got     |   1,664 |        5,163 | 0.1s | 0.03s |    24ms |        15 |       8 MB |    69 MB |        103 |     1,096× |
| fastify |   4,852 |       11,107 | 0.2s | 0.04s |    53ms |        14 |      11 MB |    72 MB |         93 |     4,618× |
| express |   6,158 |       12,271 | 0.1s | 0.02s |    43ms |        12 |      12 MB |    72 MB |        101 |     3,637× |
| vite    |   9,571 |       41,698 | 0.5s | 0.16s |    83ms |        12 |      20 MB |   112 MB |        111 |     8,370× |
| react   |  21,639 |      145,853 | 1.8s | 0.32s |    49ms |        12 |      54 MB |   152 MB |        136 |    36,475× |

React is not in the default set because it clones at 1.1 GB, eight times the
other four combined. To include it:

```sh
git clone https://github.com/facebook/react.git bench/repos/react
node bench/index.mjs bench/repos/*
```

## Reading the numbers

Cost tracks **file changes**, not commits: per file change the spread across
these five is 10 to 15µs, and that is the number to use for an estimate. Per
commit it spreads much wider, because React averages 6.7 changed files per
commit where express averages 2.0.

`MCP_DOSSIER_GIT_TIMEOUT_MS` defaults to 120s. At the slowest rate measured here
that covers about 8 million file changes, some fifty times React's history —
and that is a floor, since the rate includes the working tree read the timeout
doesn't bound. `MCP_DOSSIER_MAX_COMMITS` is the other lever: on React it roughly
halves the history pass, which is about two thirds of cold and none of warm.

Cold is the least repeatable column here. Five runs of React land anywhere
between 1.5s and 1.9s, because the working tree read depends on what the OS has
cached, so read it as a range rather than a figure. Warm and dossier hold to
within a millisecond or two, and index heap does not move at all.

Cold is the first call in a session. Every call after it hits the index cache,
keyed on HEAD, until you commit. That is the warm column, and it is what the
rest of a session pays. Warm is almost entirely the hotspot ranking reading the
working tree: the index is already built, and only the files git tracks at HEAD
are candidates.

Dossier is measured warm, on top of a built index, because that is when a
session asks for it. It is the one call that still reads line counts, and it
reads them only for the commits the index says touched that file, so it scales
with the file's history rather than the repository's — which is why React, with
by far the longest history here, is not the slowest column.

The two memory numbers answer different questions. **Index heap** is what the
history costs to hold: heap in use after a forced GC, stable run to run, and it
grows with file changes. **Peak RSS** is what the process reached at its
highest, so it is dominated by the working tree read the hotspot ranking
performs, and it moves by tens of megabytes between runs depending on when V8
decides to collect. It is sampled before the raw-log comparison below, which is
the benchmark's own doing and not work the server ever does.
