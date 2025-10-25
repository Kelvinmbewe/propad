import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));

export const createConfig = (tsconfigRootDir = ROOT_DIR) => [
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.turbo/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: true,
        tsconfigRootDir,
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off'
    }
  }
];

export default createConfig();
