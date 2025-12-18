import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src"],
  format: ["esm", "cjs"], // only esm
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false, // needed for multi-entry
  // Make naystack imports external so they resolve at runtime
  // This ensures TokenContext is shared across modules
  external: ["naystack/graphql/client"],
  esbuildPlugins: [
    {
      name: "externalize-graphql-client",
      setup(build) {
        // Mark naystack/graphql/client as external
        build.onResolve({ filter: /^naystack\/graphql\/client$/ }, () => ({
          path: "naystack/graphql/client",
          external: true,
        }));
      },
    },
  ],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
