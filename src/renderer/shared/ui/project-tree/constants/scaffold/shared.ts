export const SHARED_PACKAGE_JSON = `{
  "name": "project-name",
  "version": "0.1.0",
  "private": true
}
`

export const SHARED_TSCONFIG = `{
  "compilerOptions": {
    "strict": true
  }
}
`

export const SHARED_APP_JSON = `{
  "expo": {
    "name": "project-name",
    "slug": "project-name"
  }
}
`

export const SHARED_NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
`

export const SHARED_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()]
});
`

export const SHARED_BABEL_CONFIG = `module.exports = {
  presets: ["module:@react-native/babel-preset"]
};
`

export const SHARED_METRO_CONFIG = `const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

module.exports = mergeConfig(getDefaultConfig(__dirname), {});
`

export const SHARED_ASSET_PLACEHOLDER = `Preview unavailable for this generated asset file.\n`
