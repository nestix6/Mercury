import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test setup. jsdom so the component tests can render; the pure-logic suites
// run fine under it too. `resolve.tsconfigPaths` wires up the `@/*` alias from
// tsconfig so test imports match the app's.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
