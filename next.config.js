/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default 1MB limit would kill video uploads.
      bodySizeLimit: '100mb',
    },
    // Fixes "The global thread pool has not been initialized" on cPanel
    workerThreads: false,
    cpus: 1,
  },
  // Fallback to Terser if SWC still attempts to spawn threads during minification
  swcMinify: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
};

module.exports = nextConfig;
