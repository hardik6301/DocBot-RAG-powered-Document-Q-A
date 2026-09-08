/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: false,
  },
  experimental: {
    // Keep native canvas + pdf-parse out of the webpack bundle (Vercel/Node).
    serverComponentsExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  },
  webpack: (config) => {
    // react-pdf / pdfjs optional native deps
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
