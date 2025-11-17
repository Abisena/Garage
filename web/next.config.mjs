/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    esmExternals: true,
  },
  async rewrites() {
    const frappeBase = process.env.FRAPPE_API_BASE_URL;
    if (!frappeBase) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${frappeBase}/api/:path*`,
      },
      {
        source: '/files/:path*',
        destination: `${frappeBase}/files/:path*`,
      },
    ];
  },
};

export default nextConfig;
