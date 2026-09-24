import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/store/**/*.ts",
        "src/data/**/*.ts",
        "src/components/catalog/**/*.tsx",
        "src/components/detail/**/*.tsx",
        "src/components/home/CTAFinal.tsx",
        "src/app/api/webhooks/**/*.ts",
        "src/lib/whatsapp.ts",
        "src/lib/validators/configurador.ts",
        "src/app/admin/**/*.{ts,tsx}",
        "src/app/api/admin/**/*.ts",
        "src/lib/agenda/**/*.ts",
        "src/lib/envios/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
