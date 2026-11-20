import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Resolve `@rk/editor` to its source so the playground runs without a library
 * build and picks up editor changes through Vite's module graph.
 */
const editorSrc = decodeURIComponent(
  new URL("../../packages/editor/src/", import.meta.url).pathname,
).replace(/^\/([a-zA-Z]:)/, "$1");

// `src` is the Vite root so `index.html` can live next to the source files.
export default defineConfig({
  root: "src",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@rk\/editor$/, replacement: `${editorSrc}index.ts` },
      { find: /^@rk\/editor\/(.+)$/, replacement: `${editorSrc}$1` },
    ],
  },
});
