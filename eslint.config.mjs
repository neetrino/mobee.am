import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-unused-vars": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", { max: 3 }],
      "max-lines-per-function": [
        "warn",
        { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
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
