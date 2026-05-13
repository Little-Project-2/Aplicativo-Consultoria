module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    serviceworker: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}', 'vite.config.ts', 'playwright.config.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    {
      files: ['scripts/**/*.mjs'],
      env: {
        browser: false,
        node: true
      },
      parserOptions: {
        sourceType: 'module'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.playwright-cli/',
    'app-config.js',
    'public/app-config.js',
    'public/script.js',
    'public/pwa-register.js',
    'public/supabase.js'
  ],
  rules: {}
};
