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

module.exports = nextConfig;
