import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindMitra — Learn, Play, Grow",
    short_name: "MindMitra",
    description: "A thoughtful space to learn, recharge, and grow.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fd",
    theme_color: "#6558F5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
