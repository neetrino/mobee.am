import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Re-enable after replacing remaining `any` with precise types.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "no-unused-vars": "off",
      "no-console": "off",
      "max-lines": "off",
      "max-depth": "off",
      "max-lines-per-function": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/role-supports-aria-props": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: ["**/page.new.tsx", "**/admin.service.new.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["next.config.js", "next.config.mjs", "**/*.cjs", "eslint.config.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: ["shared/db/**/*.ts", "shared/db/**/*.js", "shared/db/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: [
      "**/app/**/page.tsx",
      "**/app/**/layout.tsx",
      "**/app/**/not-found.tsx",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    files: ["src/scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "max-depth": "off",
    },
  },
];

export default config;
