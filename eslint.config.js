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
      // Unused args are fine when prefixed with _ (e.g. handler (_args, extra)).
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
    // This config file itself: no TS project covers it.
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
