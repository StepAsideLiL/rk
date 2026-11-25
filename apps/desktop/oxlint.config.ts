import { defineConfig } from "oxlint";

import rootConfig from "../../oxlint.config.ts";

export default defineConfig({
  extends: [rootConfig],
  overrides: [
    {
      // Keep the desktop app on the full React ruleset even when this local
      // config is used instead of the root config directly.
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        "react/exhaustive-deps": "error",
        "react/globals": "error",
        "react/refs": "error",
      },
    },
  ],
});
