import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const editorSrc = decodeURIComponent(
  new URL("../../packages/editor/src/", import.meta.url).pathname,
).replace(/^\/([a-zA-Z]:)/, "$1");

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
