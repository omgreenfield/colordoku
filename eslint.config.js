import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    files: ['site/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['test/**/*.js', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
