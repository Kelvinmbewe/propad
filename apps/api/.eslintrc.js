module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/recommended', 'prettier'],
  root: true,
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'import/order': [
      'error',
      {
        'alphabetize': { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }
    ]
  }
};
