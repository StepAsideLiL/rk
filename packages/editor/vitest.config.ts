import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "src/core/**/*.test.ts",
            "src/markdown/**/*.test.ts",
            "src/extensions/**/*.test.ts",
          ],
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
