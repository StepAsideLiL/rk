import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

/**
 * Everything that is not a relative or absolute file id is a bare specifier:
 * dependencies, peer dependencies, Node built-ins and virtual modules. Keeping
 * this a predicate avoids a hand-maintained external list that drifts from
 * package.json.
 */
const isExternal = (id: string): boolean =>
  !id.startsWith("\0") && !id.startsWith(".") && !id.startsWith("/") && !/^[a-zA-Z]:[\\/]/.test(id);

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: [
        "**/*.test.*",
        "**/*.test-d.ts",
        "**/*.test-utils.*",
        "**/*.bench.ts",
        "**/setup-dom.ts",
      ],
      bundleTypes: false,
    }),
  ],
  build: {
    sourcemap: true,
    lib: {
      formats: ["es"],
      entry: {
        index: "src/index.ts",
        "react/index": "src/react/index.ts",
        "extensions/index": "src/extensions/index.ts",
        "testing/index": "src/testing/index.ts",
        "html/index": "src/html/index.ts",
      },
    },
    rollupOptions: {
      external: isExternal,
    },
  },
});
