// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.turbo/**', 'eslint.config.mjs'],
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
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['*.mjs', '*.js'],
    ...tseslint.configs.disableTypeChecked
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
