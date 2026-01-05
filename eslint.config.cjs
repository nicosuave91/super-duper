// eslint.config.cjs
const js = require('@eslint/js');
const globals = require('globals');

const vuePlugin = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const prettier = require('eslint-config-prettier');

// Vue plugin exports different config keys depending on version.
// These guards prevent crashes and keep lint running.
const vueFlat =
  (vuePlugin.configs &&
    (vuePlugin.configs['flat/vue3-recommended'] || vuePlugin.configs['flat/recommended'])) ||
  null;

const vueLegacy =
  (vuePlugin.configs && (vuePlugin.configs['vue3-recommended'] || vuePlugin.configs.recommended)) ||
  null;

const vueRecommendedRules = (vueFlat && vueFlat.rules) || (vueLegacy && vueLegacy.rules) || {};

const tsRecommendedRules =
  (tsPlugin.configs && tsPlugin.configs.recommended && tsPlugin.configs.recommended.rules) || {};

module.exports = [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/coverage/**'
    ]
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript (Node)
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsRecommendedRules
    }
  },

  // Vue SFC (Node tooling context + TS inside SFC)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      },
      globals: {
        ...globals.node
      }
    },
    plugins: {
      vue: vuePlugin,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...vueRecommendedRules
    }
  },

  // Prettier last
  prettier
];
