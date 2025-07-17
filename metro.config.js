// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-css-transformer"),
  cssModules: true,                    // ключ, чтобы получить объект styles
};

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "css"], // .css в список
};

module.exports = config;
