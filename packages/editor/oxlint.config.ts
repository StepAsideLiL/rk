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
                  "**/html",
                  "**/html/**",
                  "**/markdown",
                  "**/markdown/**",
                  "**/react",
                  "**/react/**",
                  "@rk/editor/extensions",
                  "@rk/editor/html",
                  "@rk/editor/markdown",
                  "@rk/editor/react",
                ],
                message: "core must not import from extensions, html, markdown or react.",
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
                  "**/html",
                  "**/html/**",
                  "**/react",
                  "**/react/**",
                  "@rk/editor/extensions",
                  "@rk/editor/html",
                  "@rk/editor/react",
                ],
                message: "markdown must not import from extensions, html or react.",
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
      files: ["src/html/**"],
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
                message: "html must only import from core.",
              },
            ],
          },
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
                group: [
                  "**/html",
                  "**/html/**",
                  "**/react",
                  "**/react/**",
                  "@rk/editor/html",
                  "@rk/editor/react",
                ],
                message: "extensions must not import from html or react.",
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
                  "**/html",
                  "**/html/**",
                  "**/markdown",
                  "**/markdown/**",
                  "@rk/editor/extensions",
                  "@rk/editor/html",
                  "@rk/editor/markdown",
                ],
                message: "react must not import from extensions, html or markdown.",
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
        "src/html/**/*.test.ts",
        "src/html/**/*.test-utils.ts",
      ],
      rules: {
        // Tests may assemble the public entry points to exercise integration.
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
