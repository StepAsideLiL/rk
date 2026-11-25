import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
  },
  plugins: ["import", "react", "typescript", "oxc", "unicorn"],
  ignorePatterns: ["**/out/**", "**/dist/**", "**/node_modules/**", "**/.turbo/**"],
  rules: {
    // Older packages predate the React plugin. Keep their existing baseline
    // green; the desktop app re-enables the full React rules below.
    "react/exhaustive-deps": "off",
    "react/globals": "off",
    "react/refs": "off",
  },
  overrides: [
    {
      files: ["apps/desktop/**"],
      rules: {
        "react/exhaustive-deps": "error",
        "react/globals": "error",
        "react/refs": "error",
      },
    },
  ],
});
