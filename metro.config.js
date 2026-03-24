const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// Project root = where this config lives. No Expo; pure React Native CLI.
const projectRoot = __dirname;

const config = {
  projectRoot,
  watchFolders: [projectRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
    blockList: /.*[\\/]+android[\\/]+build[\\/]+.*|.*[\\/]+android[\\/]+\.cxx[\\/]+.*|.*[\\/]+android[\\/]+build[\\/]+intermediates[\\/]+.*/,
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
