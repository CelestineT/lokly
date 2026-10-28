/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.VERCEL_DEPLOYMENT_ID ? { deploymentId: process.env.VERCEL_DEPLOYMENT_ID } : {}),
}

module.exports = nextConfig
