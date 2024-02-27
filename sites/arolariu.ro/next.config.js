// @ts-check

const trustedDomains = "arolariu.ro *.arolariu.ro clerk.com *.clerk.com accounts.dev *.accounts.dev";
const cspHeader = `
    default-src 'self' ${trustedDomains};
    script-src 'self' 'unsafe-inline' ${trustedDomains};
    style-src 'self' 'unsafe-inline' ${trustedDomains};
    img-src 'self' blob: data: 'unsafe-inline' ${trustedDomains};
    font-src 'self';
    object-src 'none';
	worker-src 'self' blob: data:;
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
`;

/**
 * @format
 * @type {import("next").NextConfig}
 */
const nextConfig = {
	basePath: "",

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

	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-DNS-Prefetch-Control",
						value: "on",
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{
						key:
							process.env.NODE_ENV === "development"
								? "Content-Security-Policy-Report-Only"
								: "Content-Security-Policy",
						value: cspHeader.replace(/\n/g, ""),
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Built-With",
						value: "ReactJS & NextJS",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), geolocation=()",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
				],
			},
		];
	},

	poweredByHeader: false,
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
