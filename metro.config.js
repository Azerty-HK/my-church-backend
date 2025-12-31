const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration pour les polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': 'react-native-get-random-values',
};

// Support pour les extensions supplémentaires
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Configuration pour les assets
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];

module.exports = config;