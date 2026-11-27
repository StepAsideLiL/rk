import { defineConfig } from "oxlint";

import rootConfig from "../../oxlint.config.ts";

export default defineConfig({
  extends: [rootConfig],
  ignorePatterns: ["node_modules", ".turbo"],
  overrides: [
    {
      // Primitives stay framework-free and DOM-free. Each framework adapter
      // renders them from its own folder under src/<framework>.
      files: ["src/primitive/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["react", "react/**", "react-dom", "react-dom/**", "@ui-sdk/react"],
                message: "primitives must not import React; render them from src/<framework>.",
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
      // This package renders primitives with React, so keep the full React
      // ruleset for the adapters even when this local config is used.
      files: ["src/react/**"],
      rules: {
        "react/exhaustive-deps": "error",
        "react/globals": "error",
        "react/refs": "error",
      },
    },
  ],
});
