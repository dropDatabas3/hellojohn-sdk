import { defineConfig } from "tsup";

export default defineConfig([
    // Main entry + server (no "use client" banner needed — consumer marks their files)
    {
        entry: {
            index: "src/index.ts",
            server: "src/server.ts",
        },
        format: ["cjs", "esm"],
        dts: true,
        clean: true,
        splitting: false,
    },
    // Pages entry — needs "use client" banner for Next.js App Router
    {
        entry: {
            pages: "src/pages/index.ts",
        },
        format: ["cjs", "esm"],
        dts: true,
        clean: false, // Don't clean dist (already done by first config)
        splitting: false,
        banner: {
            js: '"use client";',
        },
    },
]);
