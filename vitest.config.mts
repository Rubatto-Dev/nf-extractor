import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = { "@": new URL("./src", import.meta.url).pathname };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}", "eval/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integracao",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/nf/**/*.ts", "src/ui/**/*.{ts,tsx}", "eval/**/*.ts"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "eval/**/*.test.ts",
        "src/**/testes/**",
        "src/nf/domain/nota.ts",
        "src/nf/application/portas.ts",
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        "src/nf/domain/**": { statements: 80, branches: 80, functions: 80, lines: 80 },
      },
    },
  },
});
