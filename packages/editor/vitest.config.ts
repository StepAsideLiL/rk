import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
          ],
          typecheck: {
            enabled: true,
            include: [
              "src/core/**/*.test-d.ts",
              "src/markdown/**/*.test-d.ts",
              "src/extensions/**/*.test-d.ts",
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
