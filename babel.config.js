module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 ships its plugin under react-native-worklets, not
    // react-native-reanimated. Must be the LAST plugin.
    plugins: ['react-native-worklets/plugin'],
  };
};
