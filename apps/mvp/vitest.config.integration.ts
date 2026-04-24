import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/__tests__/**/*.spec.ts"],
    setupFiles: ["./test/integration/setup.ts"],
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    reporters: ["verbose"],
    coverage: {
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: ["**/*.d.ts"],
      reportsDirectory: "test/integration/coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
