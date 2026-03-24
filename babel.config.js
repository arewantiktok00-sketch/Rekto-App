const path = require('path');

// Always resolve from this config file's directory (project root). Do NOT use cwd -
// when building from Xcode or ios/, cwd can be ios/ and @ would wrongly become ios/src.
const projectRoot = path.resolve(__dirname, '.');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: [projectRoot],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': path.join(projectRoot, 'src'),
          },
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
