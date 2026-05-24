import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const rootDir = path.resolve(__dirname);

export default defineConfig({
  root: rootDir,
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: path.join(rootDir, "index.html"),
    },
  },
});
