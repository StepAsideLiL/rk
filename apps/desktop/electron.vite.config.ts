import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

const sharedAlias = {
  "@shared": resolve(__dirname, "src/shared"),
};

export default defineConfig({
  main: {
    resolve: {
      alias: sharedAlias,
    },
  },
  preload: {
    build: {
      externalizeDeps: false,
    },
    resolve: {
      alias: sharedAlias,
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve(__dirname, "src/renderer/src"),
        ...sharedAlias,
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
