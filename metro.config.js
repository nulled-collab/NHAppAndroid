const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // Enable CSS support for react-native-web
  isCSSEnabled: true,
});

config.transformer = {
  ...config.transformer,
  // Use react-native-css-transformer for CSS files
  babelTransformerPath: require.resolve('react-native-css-transformer'),
  // Ensure other transformer options are preserved
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  // Add CSS to source extensions
  sourceExts: [...config.resolver.sourceExts, 'css'],
  // Ignore native-only modules for web
  extraNodeModules: {
    'react-native/Libraries/Utilities/codegenNativeCommands': null,
  },
};

module.exports = config;