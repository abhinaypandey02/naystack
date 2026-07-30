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
    // `splitting: false` inlines every shared module into each entry, giving each
    // one its own copy of any module-level state. The access-token store IS
    // module-level state and must be a single instance: `useLogin`/`useLogout`
    // write it from the `auth/client` entry, and the Apollo auth link reads it
    // from the `graphql/client` entry. Keeping it external makes both resolve to
    // the same `dist/auth/token-store` module.
    "naystack/auth/token-store",
    "@apollo/client-integration-nextjs",
  ],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
