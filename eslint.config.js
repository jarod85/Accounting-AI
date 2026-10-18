// ESLint for the TypeScript workspaces (Expo app and core). The Deno Edge
// Function is linted separately with `npm run lint:functions`.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Resolve each workspace's "@/..." path alias from its own tsconfig.
    settings: {
      'import/resolver': {
        typescript: { project: ['apps/mobile/tsconfig.json', 'packages/core/tsconfig.json'] },
      },
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/dist/**',
      'supabase/**',
      'apps/mobile/expo-env.d.ts',
    ],
  },
  {
    // core is pure domain logic: no React, Expo, Supabase or app code.
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-native', 'expo', 'expo-*', '@supabase/*', '@/*'],
              message: 'packages/core must stay free of I/O and UI code.',
            },
            {
              group: ['node:*'],
              message: 'packages/core also runs in Deno and React Native; avoid Node APIs.',
            },
          ],
        },
      ],
    },
  },
  {
    // Only the services layer knows about Supabase, and features talk to each
    // other only through their index.ts, never through internal files.
    files: ['apps/mobile/src/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/services/supabase/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@supabase/supabase-js', message: 'Use the ports in @/services/ports.' }],
          patterns: [
            {
              group: ['@/features/*/*'],
              message: "Import from the feature's index (e.g. '@/features/expenses') instead.",
            },
          ],
        },
      ],
    },
  },
]);
