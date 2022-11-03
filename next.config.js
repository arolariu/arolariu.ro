/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: { appDir: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placeimg.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
