/** @format */

import typography from "@tailwindcss/typography";
import daisyUI from "daisyui";
import type {Config} from "tailwindcss";

const tailwindConfig = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      "2xsm": "320px",
      xsm: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      "3xl": "1976px",
    },
  },
  plugins: [typography, daisyUI],
  future: {hoverOnlyWhenSupported: true},
} satisfies Config;

export default tailwindConfig;
