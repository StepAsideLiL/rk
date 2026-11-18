import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `src` is the Vite root so `index.html` can live next to the source files.
export default defineConfig({
  root: "src",
  plugins: [react(), tailwindcss()],
});
