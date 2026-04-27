/**
 * @fileoverview PostCSS configuration for the shared components package (V2).
 * Uses only cssnano for minification.
 * @module packages/components/postcss.config
 */

const config = {
  plugins: {
    cssnano: {},
  },
};

export default config;
