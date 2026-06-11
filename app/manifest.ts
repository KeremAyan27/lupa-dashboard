import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lupa — CEO Dashboard",
    short_name: "Lupa",
    description:
      "Mobile-first decision support system with rule-based anomaly alerts.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#F7F8FA",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
