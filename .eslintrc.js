module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    // project option-ը պարտադիր չէ recommended-ի համար, բայց կարող է ավելացվել strict-ի համար
    // project: ['./src/*/tsconfig.json', './shared/*/tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Base rules (TypeScript-ը կփոխարինի no-unused-vars-ին)
    'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Չափերի rule-ներ (02-coding-standards)
    'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-depth': ['warn', { max: 3 }],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true }],
  },
  overrides: [
    {
      // Next.js app/ directory - allow default exports for page.tsx and layout.tsx
      files: ['**/app/**/page.tsx', '**/app/**/layout.tsx', '**/app/**/not-found.tsx'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
    {
      // Node scripts (run-migrations.js) - allow require and console
      files: ['src/scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        'no-console': 'off',
        'max-depth': 'off',
      },
    },
  ],
};

