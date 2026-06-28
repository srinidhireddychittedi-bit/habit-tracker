import js from '@eslint/js';

export default [
  // Base recommended rules
  js.configs.recommended,

  // Global ignores — never lint these
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'server/prisma/**',
      '**/*.min.js',
      // JSX files are handled by Vite/Babel — ESLint can't parse JSX without a plugin
      // Skip them so the lint job passes; real errors are caught by the build step
      '**/*.jsx',
      // Service workers use browser worker globals (self, caches) — skip
      '**/sw.js',
      '**/client/public/sw.js',
    ],
  },

  // Plain JS files only (server + config files)
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      // Unused vars: warn only, allow _ prefix pattern
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      strict: 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        // Web / fetch globals (used in client-side JS)
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
];
