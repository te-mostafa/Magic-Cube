const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const customConfig = {
  resolver: {
    assetExts: ['glb', 'gltf', 'png', 'jpg'],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), customConfig);
