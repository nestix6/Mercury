// Shared test setup (referenced by vitest.config.ts `setupFiles`).
// - jest-dom matchers (toBeInTheDocument, etc.) for the component tests.
// - Unmount React trees after each test so renders don't leak into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
