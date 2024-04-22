const postcssConfig = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {},
    "@fullhuman/postcss-purgecss": {
      content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
      css: ["./src/**/*.css"],
      defaultExtractor: (/** @type {string} */ content) => content.match(/[A-Za-z0-9-_:[/\]%]+/g) || [],
      safelist: ["html", "body"],
      fontFace: true,
      keyframes: true,
      variables: true,
    },
  },
};

module.exports = postcssConfig;
