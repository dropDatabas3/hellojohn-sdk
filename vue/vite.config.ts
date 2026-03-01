import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ["src"],
      entryRoot: "src",
      outDir: "dist",
      insertTypesEntry: false,
      copyDtsFiles: true
    })
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: {
        index: resolve(__dirname, "src/index.ts"),
        "nuxt/module": resolve(__dirname, "src/nuxt/module.ts"),
        "nuxt/plugin": resolve(__dirname, "src/nuxt/plugin.ts")
      },
      external: ["vue", "@hellojohn/js", "@nuxt/kit", "#app"],
      output: [
        {
          format: "es",
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          exports: "named"
        },
        {
          format: "cjs",
          entryFileNames: "[name].cjs",
          chunkFileNames: "chunks/[name]-[hash].cjs",
          assetFileNames: "assets/[name]-[hash][extname]",
          exports: "named"
        }
      ]
    }
  }
});
