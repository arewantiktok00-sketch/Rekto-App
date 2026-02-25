const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Avoid Metro watching native build output folders on Windows.
config.resolver.blockList = /.*[\\/]+android[\\/]+build[\\/]+.*|.*[\\/]+android[\\/]+\.cxx[\\/]+.*|.*[\\/]+android[\\/]+build[\\/]+intermediates[\\/]+.*/;

module.exports = config;
