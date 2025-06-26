/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_CDN_HOSTNAME || 'localhost',
      },
      {
        protocol: 'http',
        hostname: process.env.NEXT_PUBLIC_CDN_HOSTNAME || 'localhost',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
}

module.exports = {
  ...nextConfig,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
} 