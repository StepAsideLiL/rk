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
                  "@rk/editor/extensions",
                  "@rk/editor/markdown",
                  "@rk/editor/react",
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
                group: [
                  "**/extensions",
                  "**/extensions/**",
                  "**/react",
                  "**/react/**",
                  "@rk/editor/extensions",
                  "@rk/editor/react",
                ],
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
                group: ["**/react", "**/react/**", "@rk/editor/react"],
                message: "extensions must not import from react.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/react/**"],
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
                  "@rk/editor/extensions",
                  "@rk/editor/markdown",
                ],
                message: "react must not import from extensions or markdown.",
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        "src/react/**/*.test.{ts,tsx}",
        "src/react/**/*.test-utils.{ts,tsx}",
        "src/react/**/*.test-d.ts",
      ],
      rules: {
        // React tests may use the extension set to exercise the bindings.
        "no-restricted-imports": "off",
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
