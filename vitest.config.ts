import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors the "@/*" path alias from tsconfig.json. Declared directly rather
  // than via vite-tsconfig-paths, which is ESM-only and cannot be loaded by the
  // CommonJS config loader this project uses.
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    // Integration specs share one Supabase project and one dev server, so
    // running files in parallel would let them clobber each other's rows.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
