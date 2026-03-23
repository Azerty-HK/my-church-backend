/**
 * metro.config.js
 * Expo + TypeScript + Windows + CommonJS
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ============================================
// Résolution des modules et polyfills
// ============================================
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-get-random-values', // polyfill crypto
};

// Extensions supportées
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
  'ts',
  'tsx',
  'jsx',
];

// Assets supplémentaires
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'bin',
];

// Pour s'assurer que Metro surveille correctement le dossier du projet
config.watchFolders = [
  path.resolve(__dirname),
];

// ============================================
// Export en CommonJS (important pour Windows + Metro)
module.exports = config;
