import { defineConfig } from "vitest/config";

// Without an explicit include, vitest's default glob reaches into bench/repos/,
// where `bench/index.mjs --clone` puts other projects' suites. Every test this
// repository has lives beside its source.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
