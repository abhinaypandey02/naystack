import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false,
  external: [
    "next",
    "react",
    "react-dom",
    "@apollo/server",
    "@as-integrations/next",
    "@vercel/functions",
    "bcryptjs",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "googleapis",
    "naystack/auth/client",
    "@apollo/client-integration-nextjs",
  ],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
