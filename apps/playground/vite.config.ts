import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const editorSrc = decodeURIComponent(
  new URL("../../packages/editor/src/", import.meta.url).pathname,
).replace(/^\/([a-zA-Z]:)/, "$1");

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: [
      { find: /^@rk\/editor$/, replacement: `${editorSrc}index.ts` },
      { find: /^@rk\/editor\/(.+)$/, replacement: `${editorSrc}$1` },
    ],
  },
});
