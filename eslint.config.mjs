import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import tsLint from "typescript-eslint";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import prettierConfig from "eslint-plugin-prettier/recommended";
import unusedImports from "eslint-plugin-unused-imports";
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.plugins("react-refresh", "simple-import-sort", "tailwindcss"),
  ...tsLint.configs.recommended,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "prettier/prettier": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "react/no-unescaped-entities": 0,
      "simple-import-sort/imports": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "simple-import-sort/exports": "warn",
      "unused-imports/no-unused-imports": "warn",
    },
  },
  prettierConfig,
];

export default config;
