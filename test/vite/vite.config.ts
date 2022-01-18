/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import rwc from "react-worker-components-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [rwc(), Inspect()],
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    global: true,
  },
});
