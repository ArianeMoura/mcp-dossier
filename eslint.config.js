import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    // tsconfig.check.json, not tsconfig.json: the build config excludes tests,
    // and type-aware rules need them in a project to parse at all.
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.check.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Unused args are fine when prefixed with _, as in `filter((_, i) => …)`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests use throwaway fixtures and loose shapes.
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // This config file and the benchmark: no TS project covers them, so the
    // node globals @types/node supplies everywhere else have to be declared.
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        console: "readonly",
        performance: "readonly",
        process: "readonly",
      },
    },
  },
);
