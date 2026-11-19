import { defineConfig } from "oxlint";

import rootConfig from "../../oxlint.config.ts";

export default defineConfig({
  extends: [rootConfig],
  ignorePatterns: ["dist", "node_modules"],
  overrides: [
    {
      files: ["src/core/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "**/extensions",
                  "**/extensions/**",
                  "**/markdown",
                  "**/markdown/**",
                  "**/react",
                  "**/react/**",
                ],
                message: "core must not import from extensions, markdown or react.",
              },
            ],
          },
        ],
        "no-restricted-globals": [
          "error",
          "window",
          "document",
          "navigator",
          "HTMLElement",
          "Node",
          "MutationObserver",
        ],
      },
    },
    {
      files: ["src/markdown/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["**/extensions", "**/extensions/**", "**/react", "**/react/**"],
                message: "markdown must not import from extensions or react.",
              },
            ],
          },
        ],
        "no-restricted-globals": [
          "error",
          "window",
          "document",
          "navigator",
          "HTMLElement",
          "Node",
          "MutationObserver",
        ],
      },
    },
    {
      files: ["src/extensions/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["**/react", "**/react/**"],
                message: "extensions must not import from react.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test-d.ts"],
      rules: {
        // Tests may exercise DOM-facing behavior (for example plugin view
        // lifecycles) even when the source folder itself must stay DOM-free.
        "no-restricted-globals": "off",
      },
    },
  ],
});
