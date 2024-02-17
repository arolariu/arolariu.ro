/**
 * @format
 * @type {import("next").NextConfig}
 */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "dummyimage.com",
			},
			{
				protocol: "https",
				hostname: "arolariustorage.blob.core.windows.net",
			},
			{
				protocol: "https",
				hostname: "*.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
		],
	},

	output: "standalone",
};

// Service Worker for PWA.
const withSerwist = require("@serwist/next").default({
	cacheOnFrontEndNav: true,
	swSrc: "src/sw.ts",
	swDest: "public/sw.js",
	reloadOnOnline: true,
	disable: process.env.NODE_ENV === "development",
});

module.exports = withSerwist(nextConfig);
