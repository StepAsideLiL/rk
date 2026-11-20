import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts", "src/markdown/**/*.ts", "src/html/**/*.ts"],
      exclude: ["**/*.test.*", "**/*.test-d.ts", "**/*.test-utils.*", "**/*.bench.ts"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
    },
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          exclude: ["**/node_modules/**", "**/dist/**", "**/*.dom.test.{ts,tsx}"],
          include: [
            "src/core/**/*.test.ts",
            "src/markdown/**/*.test.ts",
            "src/extensions/**/*.test.ts",
            "src/html/**/*.test.ts",
          ],
          typecheck: {
            enabled: true,
            include: [
              "src/core/**/*.test-d.ts",
              "src/markdown/**/*.test-d.ts",
              "src/extensions/**/*.test-d.ts",
              "src/html/**/*.test-d.ts",
            ],
            tsconfig: "./tsconfig.json",
          },
        },
      },
      {
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/react/**/*.test.{ts,tsx}", "src/**/*.dom.test.{ts,tsx}"],
          setupFiles: ["./src/testing/setup-dom.ts"],
        },
      },
    ],
  },
});
