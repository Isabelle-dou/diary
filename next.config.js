/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Production configuration
  output: 'standalone', // Enables standalone output for Docker/Kubernetes deployment
  images: {
    // Add image domains if you need to load images from external sources
    domains: ['public.blob.vercel-storage.com'],
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],
  },
  // Enable React strict mode
  reactStrictMode: true,
  // Optimize fonts
  optimizeFonts: true,
}

module.exports = nextConfig
