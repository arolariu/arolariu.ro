const postcssConfig = {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {},
    "postcss-dropunusedvars": {},
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
