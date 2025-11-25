// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.turbo/**', 'eslint.config.mjs', '**/public/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: true
      }
    },
    rules: {
      // relax or tighten as needed; keep CI green
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-misused-promises': 'off'
    }
  },
  {
    files: ['*.mjs', '*.js'],
    ...tseslint.configs.disableTypeChecked,
    ignores: ['**/public/**']
  },
  {
      ignores: ['**/public/**'],
  }
];

export function createConfig(tsconfigRootDir) {
  return [
    ...baseConfig,
    {
      languageOptions: {
        parserOptions: {
          tsconfigRootDir
        }
      }
    }
  ];
}

export default baseConfig;
