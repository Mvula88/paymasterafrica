/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@paymaster/database', '@paymaster/shared', '@paymaster/tax-engine'],
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig