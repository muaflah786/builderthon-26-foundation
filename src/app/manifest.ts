import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ORDOX",
    short_name: "ORDOX",
    description: "One platform. Every situation. Run temporary operations with zero training.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c2410c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
