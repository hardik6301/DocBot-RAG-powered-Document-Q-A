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
};

export default nextConfig;
