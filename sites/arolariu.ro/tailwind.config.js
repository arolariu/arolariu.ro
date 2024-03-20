/**
 * @format
 * @type {import('tailwindcss').Config}
 */
const tailwindConfig = {
	content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
	darkMode: ["selector", "[data-mantine-color-scheme='dark']"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			keyframes: {
				"accordion-down": {
					from: {height: "0"},
					to: {height: "var(--radix-accordion-content-height)"},
				},
				"accordion-up": {
					from: {height: "var(--radix-accordion-content-height)"},
					to: {height: "0"},
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
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
	plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate"), require("daisyui")],
};

export default tailwindConfig;

