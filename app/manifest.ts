import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BetLab",
    short_name: "BetLab",
    description: "Centre privé d'analyse et de suivi des paris football.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07101c",
    theme_color: "#07101c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
