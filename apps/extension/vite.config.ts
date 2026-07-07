import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist", emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: { "side-panel": resolve(import.meta.dirname, "side-panel.html"), "service-worker": resolve(import.meta.dirname, "src/entries/service-worker.ts"), "content-script": resolve(import.meta.dirname, "src/entries/content-script.ts") }, output: { entryFileNames: "assets/[name].js", chunkFileNames: "assets/[name]-[hash].js", assetFileNames: "assets/[name]-[hash][extname]" } }
  }
});
