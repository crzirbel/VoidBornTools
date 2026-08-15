import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // Relative base so the built assets resolve correctly whether this is
  // hosted at a domain root or under a GitHub Pages project subpath
  // (e.g. https://username.github.io/voidborn-sheet/).
  base: "./",
  server: {
    // Since Vite v6.0.9, CORS is disabled by default for the dev server.
    // Owlbear Rodeo needs to fetch your manifest/site from its own origin,
    // so this is required for local dev testing (not needed once deployed).
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        editor: resolve(import.meta.dirname, "editor.html"),
      },
    },
  },
});
