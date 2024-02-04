/**
 * @format
 * @type {import('tailwindcss').Config}
 */
const tailwindConfig = {
	content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
	darkMode: "class",
	theme: {
		extend: {},
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
	plugins: [require("@tailwindcss/typography"), require("daisyui")],
};

module.exports = tailwindConfig;
