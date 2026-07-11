// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ignore the src-tauri folder so the Rust compilation doesn't crash Metro bundler's watcher
const exclusionRegex = /src-tauri\/.*/;
if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(exclusionRegex);
} else if (config.resolver.blockList) {
  config.resolver.blockList = [config.resolver.blockList, exclusionRegex];
} else {
  config.resolver.blockList = [exclusionRegex];
}

module.exports = config;
