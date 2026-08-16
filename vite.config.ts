import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        editor: resolve(import.meta.dirname, "editor.html"),
        feedback: resolve(import.meta.dirname, "feedback.html"),
      },
    },
  },
});
