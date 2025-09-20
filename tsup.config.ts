import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src"],
  format: ["esm", "cjs"], // only esm
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false, // needed for multi-entry
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
