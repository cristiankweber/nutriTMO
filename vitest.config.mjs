import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const vitestConfig = {
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
};

export default vitestConfig;
