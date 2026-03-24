const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: [
      '**/dist/**', '**/build/**', '**/node_modules/**', '**/ios/build/**',
      '**/*.config.js', 'babel.config.js', 'metro.config.js', 'debug.bundle.js', 'debug.bundle.map',
      '**/Pods/**', '**/.expo/**', '**/coverage/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: require('@babel/eslint-parser'),
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ['@babel/preset-react', ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]] },
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]);
