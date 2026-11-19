import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Absolute path to `src`, derived from this config so the alias keeps working
 * when pnpm runs the script from the package directory on Windows or POSIX.
 */
const srcDir = decodeURIComponent(new URL("../src/", import.meta.url).pathname).replace(
  /^\/([a-zA-Z]:)/,
  "$1",
);

export default defineConfig({
  root: "playground",
  plugins: [react()],
  server: {
    // 5173 is the root @rk/playground app; keep both runnable via `pnpm dev`.
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: [
      { find: /^@rk\/editor$/, replacement: `${srcDir}index.ts` },
      { find: /^@rk\/editor\/(.+)$/, replacement: `${srcDir}$1` },
    ],
  },
});
