/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from "vite";
import rwc from "react-worker-components-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [rwc()],
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    global: true,
  },
});
