import type { NextConfig } from "next";
const development = process.env.NODE_ENV === "development";
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.googleusercontent.com; font-src 'self'; media-src 'self' blob:; connect-src 'self' ${development ? "ws:" : ""}; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'`,
          },
        ],
      },
      {
        source: "/:path(watch/create|admin/videos/upload)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
