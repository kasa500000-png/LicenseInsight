import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
    "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
  } },
  test: {
    environment: "node",
    include: ["tests/database/node/**/*.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    allowOnly: false,
    passWithNoTests: false,
  },
});
