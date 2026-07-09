import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function vendorChunkName(id: string): string | undefined {
  const normalized = id.replace(/\\/g, "/");
  if (!normalized.includes("node_modules")) return undefined;

  const packagePath = normalized.split("node_modules/").at(-1);
  if (!packagePath) return undefined;

  const segments = packagePath.split("/");
  const packageName = segments[0]?.startsWith("@") ? `${segments[0]}/${segments[1] ?? ""}` : segments[0];
  if (!packageName) return undefined;

  if (packageName === "shiki" || packageName.startsWith("@shikijs/")) return "vendor-shiki";
  if (
    packageName.includes("micromark") ||
    packageName.includes("mdast") ||
    packageName.includes("hast") ||
    packageName.includes("unist") ||
    packageName.includes("remark") ||
    packageName.includes("rehype") ||
    packageName === "react-markdown" ||
    packageName === "unified" ||
    packageName.startsWith("vfile")
  ) {
    return "vendor-markdown";
  }
  if (packageName === "dexie") return "vendor-storage";
  if (["react", "react-dom", "scheduler"].includes(packageName)) return "vendor-react";
  if (["framer-motion", "lucide-react", "class-variance-authority", "clsx", "tailwind-merge"].includes(packageName)) {
    return "vendor-ui";
  }
  if (["zod", "zustand", "@tanstack/react-query", "react-hook-form", "@hookform/resolvers"].includes(packageName)) {
    return "vendor-state";
  }
  return `vendor-${packageName.replace("@", "").replace("/", "-")}`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist", emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        "side-panel": resolve(import.meta.dirname, "side-panel.html"),
        "service-worker": resolve(import.meta.dirname, "src/entries/service-worker.ts"),
        "content-script": resolve(import.meta.dirname, "src/entries/content-script.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          return vendorChunkName(id);
        },
      },
    }
  }
});
