import { defineConfig } from "vitest/config";

// Each integration test builds a throwaway git repository and commits into it,
// in the hook as well as the body, which costs seconds before any assertion
// runs. On a loaded machine the slowest of them cross vitest's 5s default.
const GIT_TEST_TIMEOUT_MS = 20_000;

export default defineConfig({
  test: {
    // Without an explicit include, vitest's default glob reaches into
    // bench/repos/, where `bench/index.mjs --clone` puts other projects'
    // suites. Every test this repository has lives beside its source.
    include: ["src/**/*.test.ts"],
    testTimeout: GIT_TEST_TIMEOUT_MS,
    hookTimeout: GIT_TEST_TIMEOUT_MS,
  },
});
