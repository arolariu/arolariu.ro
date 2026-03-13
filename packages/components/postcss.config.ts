/**
 * @fileoverview PostCSS configuration for the shared components package (V2).
 * Uses only cssnano for minification — no Tailwind CSS.
 * @module packages/componentsV2/postcss.config
 */

const config = {
  plugins: {
    cssnano: {},
  },
};

export default config;
