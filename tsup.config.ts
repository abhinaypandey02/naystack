import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src"],
  format: ["esm", "cjs"], // only esm
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false,
  external: ["naystack/auth/email/client"],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
